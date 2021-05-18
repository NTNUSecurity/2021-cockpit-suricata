/*
This file is part of cockpit-suricata.
Copyright (C) 2021 NTNU, Seksjon for Digital sikkerhet.

Original Authors:
    Anders Svarverud
    Said-Emin Evmurzajev
    Sigve Sudland
    Sindre Morvik

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
*/

import './vars.jsx';
import './service.scss';

import {
  Button,
  PageSection,
  PageSectionVariants,
  Toolbar,
  ToolbarItem,
} from '@patternfly/react-core';
import { PauseCircleIcon, PlayIcon, UndoIcon } from '@patternfly/react-icons';
import cockpit from 'cockpit';
import React from 'react';

import { getSuricataVersion } from './utils.jsx';

const systemd_client = cockpit.dbus('org.freedesktop.systemd1', {
  superuser: 'try',
});
const SD_MANAGER = 'org.freedesktop.systemd1.Manager';
const SD_OBJ = '/org/freedesktop/systemd1';
const SuricataPath = '/org/freedesktop/systemd1/unit/suricata_2eservice';

export class Service extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      SurSignatures: 'Loading...',
      SurVersion: 'Loading...',
      UnitName: 'Loading...',
      UnitPreset: 'Loading...',
      UnitStatus: 'Loading...',
    };

    systemd_client
      .call(SuricataPath, 'org.freedesktop.DBus.Properties', 'GetAll', [
        'org.freedesktop.systemd1.Unit',
      ])
      .then((result) => {
        this.setState({
          UnitStatus: `${result[0].ActiveState.v} (${result[0].SubState.v})`,
        });
        this.setState({ UnitName: result[0].Description.v });
        this.setState({ UnitPreset: result[0].UnitFilePreset.v });
      });

    cockpit
      .spawn(['wc', '-l', '/var/lib/suricata/rules/suricata.rules'], { superuser: 'try' })
      .then((output) => {
        this.setState({
          SurSignatures: output.split(' ')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ','),
        });
      })

      .catch(() => {
        this.setState({
          SurSignatures: 0,
        });
      });

    getSuricataVersion().then((version) => this.setState({ SurVersion: version }));
  }

  componentDidMount() {
    systemd_client.subscribe(
      {
        interface: 'org.freedesktop.DBus.Properties',
        member: 'PropertiesChanged',
      },
      (path, _iface, _signal, args) => {
        if (path == SuricataPath)
          if (args[0] == 'org.freedesktop.systemd1.Unit') {
            if (
              typeof args[1].ActiveState !== 'undefined' &&
              typeof args[1].SubState !== 'undefined'
            )
              this.setState({
                UnitStatus: `${args[1].ActiveState.v} (${args[1].SubState.v})`,
              });
            if (typeof args[1].UnitFilePreset !== 'undefined')
              this.setState({ UnitPreset: args[1].UnitFilePreset.v });
          }
      },
    );
  }

  unitCall(action) {
    systemd_client.call(SD_OBJ, SD_MANAGER, action, ['suricata.service', 'replace']);
  }

  render() {
    const { UnitPreset, UnitStatus, UnitName, SurVersion, SurSignatures } = this.state;
    return (
      <PageSection variant={PageSectionVariants.light}>
        <Toolbar>
          <ToolbarItem>
            <Button
              variant="primary"
              icon={<PlayIcon fontSize="small" />}
              onClick={() => this.unitCall('StartUnit')}
              size="lg"
              id="start-button">
              Start
            </Button>{' '}
            <Button
              variant="danger"
              icon={<PauseCircleIcon fontSize="small" />}
              onClick={() => this.unitCall('StopUnit')}
              size="lg"
              id="stop-button">
              Stop
            </Button>{' '}
            <Button
              variant="warning"
              icon={<UndoIcon fontSize="small" />}
              onClick={() => this.unitCall('RestartUnit')}
              size="lg"
              id="restart-button">
              Restart
            </Button>{' '}
          </ToolbarItem>
        </Toolbar>
        <div>
          Suricata - : {UnitName} ({UnitPreset})
        </div>
        <div>
          Suricata status:
          {(UnitStatus.startsWith('active') && (
            <span className="service-active"> {UnitStatus}</span>
          )) || <span className="service-down"> {UnitStatus}</span>}
        </div>
        <div>
          Suricata version: <span className="suricata-version">{SurVersion}</span>
        </div>
        <div>
          Signatures active: <span className="suricata-signatures:">{SurSignatures}</span>
        </div>
      </PageSection>
    );
  }
}
