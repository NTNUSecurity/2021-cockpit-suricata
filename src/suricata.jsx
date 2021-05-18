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

import { Page, PageSection, PageSectionVariants } from '@patternfly/react-core';
import cockpit from 'cockpit';
import React from 'react';

import { Alerts } from './alerts.jsx';
import { Config } from './config.jsx';
import { Logs } from './logs.jsx';
import { Service } from './service.jsx';
import { Signatures } from './signatures.jsx';
import { SuricataTabs } from './suricata-tabs.jsx';

export class Suricata extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      /* State related to the toolbar/tabs components */
      activeTab:
        typeof cockpit.location.options.type !== 'undefined'
          ? cockpit.location.options.type
          : 'service',
      tabErrors: {},
    };
    this.seenPaths = new Set();
    this.path_by_id = {};
    this.operationInProgress = {};

    this.on_navigate = this.on_navigate.bind(this);

    if (cockpit.location.options.type !== this.activeTab) {
      this.setState({ activeTab: cockpit.location.options.type });
    }
  }

  componentDidMount() {
    cockpit.addEventListener('locationchanged', this.on_navigate);
    this.on_navigate();
  }

  componentWillUnmount() {
    cockpit.removeEventListener('locationchanged', this.on_navigate);
  }

  on_navigate() {
    const newState = { path: cockpit.location.path };
    if (cockpit.location.options && cockpit.location.options.type) {
      newState.activeTab = cockpit.location.options.type;
    }
    this.setState(newState);
  }

  render() {
    const { activeTab, tabErrors } = this.state;

    return (
      <Page>
        <PageSection type="nav" variant={PageSectionVariants.light}>
          <SuricataTabs
            activeTab={activeTab}
            onChange={(Tab) => {
              cockpit.location.go([], Object.assign(cockpit.location.options, { type: Tab }));
            }}
            tabErrors={tabErrors}
          />

          {activeTab == 'service' && <Service />}
          {activeTab == 'signatures' && <Signatures />}
          {activeTab == 'config' && <Config />}
          {activeTab == 'logs' && <Logs />}
          {activeTab == 'alerts' && <Alerts />}
        </PageSection>
      </Page>
    );
  }
}
