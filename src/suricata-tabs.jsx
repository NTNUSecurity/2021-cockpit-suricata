/*
This file is part of cockpit-suricata.
Copyright (C) Sigve Sudland, 2021

Original Authors:
    Anders Svarverud
    Said-Emin Evmurzajev
    Sigve Sudland
    Sindre Morvik

This module is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation; either
version 2.1 of the License, or (at your option) any later version.

This module is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public
License along with this module; if not, write to the Free Software
Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
*/

import { Nav, NavItem, NavList } from '@patternfly/react-core';
import cockpit from 'cockpit';
import PropTypes from 'prop-types';
import React, { useState } from 'react';

const _ = cockpit.gettext;

export const service_tabs_suffixes = ['service', 'signatures', 'logs', 'config', 'alerts'];

export function SuricataTabs({ onChange, activeTab, tabErrors }) {
  const service_tabs = {
    service: _('Service'),
    signatures: _('Signatures'),
    logs: _('Logs'),
    config: _('Config'),
    alerts: _('Alerts'),
  };

  const [activeItem, setActiveItem] = useState(activeTab);

  return (
    <Nav
      variant="tertiary"
      id="services-filter"
      onSelect={(result) => {
        setActiveItem(result.itemId);
        onChange(result.itemId);
      }}>
      <NavList>
        {Object.keys(service_tabs).map((key) => (
          <NavItem itemId={key} key={key} preventDefault isActive={activeItem == key}>
            {service_tabs[key]}
            {tabErrors[key] ? <span className="fa fa-exclamation-circle" /> : null}
          </NavItem>
        ))}
      </NavList>
    </Nav>
  );
}
SuricataTabs.propTypes = {
  onChange: PropTypes.func.isRequired,
};
