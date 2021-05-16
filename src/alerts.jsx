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

import './alerts.scss';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  PageSection,
  PageSectionVariants,
  Title,
} from '@patternfly/react-core';
import {
  info,
  sortable,
  SortByDirection,
  Table,
  TableBody,
  TableHeader,
  wrappable,
} from '@patternfly/react-table';
import cockpit from 'cockpit';
import * as moment from 'moment';
import React from 'react';

import { getMyTableId } from './utils.jsx';

// IDEAS
// Add some sort of animation or indication when new entry are put in
// TODO Add setInterval to update all momentjs.fromNow() to current time

export class Alerts extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      columns: [
        { title: 'Time', transforms: [sortable] },
        {
          title: 'Priority',
          transforms: [
            info({
              tooltip:
                'Signatures with a higher priority will be examined first. The highest priority is 1.',
            }),
            sortable,
          ],
        },
        {
          title: 'Protocol/App',
          transforms: [
            sortable,
            info({
              tooltip: 'Which protocol and application layers it operates on.',
            }),
          ],
        },
        {
          title: 'Category',
          transforms: [sortable, wrappable],
        },
        {
          title: 'Id',
          transforms: [sortable],
        },
        {
          title: 'Signature',
          transforms: [
            info({
              tooltip: 'Information about the alert',
            }),
          ],
        },
        {
          title: 'Action',
          transforms: [
            info({
              tooltip: 'The action taken after signature match',
            }),
          ],
        },
        {
          title: 'Source',
          transforms: [],
        },
        {
          title: 'Destination',
          transforms: [],
        },
      ],

      columnsCount: [
        { title: 'Signatures', transforms: [sortable] },
        { title: 'Count', transforms: [sortable] },
      ],
      isNew: true,
      nrOfAlerts: 0,
      rows: { 'signature-table': [], 'repeated-table': [] },
      showNr: 50,
      sortBy: [],
    };
    this.eventEntries = [];
    this.counter = 0;
    this.nrOfEvents = 0;
    this.alarmEvents = [];
    this.onSort = this.onSort.bind(this);
    this.logFile = '/var/log/suricata/eve.json';
  }

  componentDidMount() {
    this.watchFile();
  }

  componentWillUnmount() {}

  onSort(_event, index, direction) {
    const id = getMyTableId(_event);
    const { rows, sortBy } = this.state;
    if (typeof sortBy[id] == 'undefined') sortBy[id] = {};
    let sortedRows;
    if (index === 0 && id == 'signature-table')
      // time == 0 is an object
      sortedRows = rows[id].sort((a, b) =>
        a[index].props.children[0].props.children < b[index].props.children[0].props.children
          ? -1
          : a[index].props.children[0].props.children > b[index].props.children[0].props.children
          ? 1
          : 0,
      );
    else
      sortedRows = rows[id].sort((a, b) =>
        a[index] < b[index] ? -1 : a[index] > b[index] ? 1 : 0,
      );

    sortBy[id] = { direction, index };
    rows[id] = direction === SortByDirection.asc ? sortedRows : sortedRows.reverse();
    this.setState({
      rows,
      sortBy,
    });
  }

  updateSort(id) {
    const { rows, sortBy } = this.state;
    if (typeof sortBy[id] == 'undefined') sortBy[id] = {};
    if (typeof sortBy[id].index == 'undefined') return;
    const sortedRows = rows.sort((a, b) =>
      a[sortBy[id].index] < b[sortBy[id].index]
        ? -1
        : a[sortBy[id].index] > b[sortBy[id].index]
        ? 1
        : 0,
    );
    this.setState({
      rows: sortBy[id].direction !== 'asc' ? sortedRows.reverse() : sortedRows,
    });
  }

  pushAlert(elObj) {
    if (elObj.event_type == 'alert') {
      const timeStmp = moment(elObj.timestamp);
      return [
        <>
          <div>{timeStmp.format('l LTS')}</div>
          <div style={{ display: 'block ruby', fontSize: '12px' }}>{timeStmp.fromNow()}</div>
        </>,
        elObj.alert.severity,
        `${elObj.proto}/${elObj.app_proto}`,
        elObj.alert.category,
        elObj.alert.signature_id,
        elObj.alert.signature,
        elObj.alert.action,
        `${elObj.src_ip}:${elObj.src_port}`,
        `${elObj.dest_ip}:${elObj.dest_port}`,
      ];
    }
    return null;
  }

  watchFile() {
    // Loads the content from eve.json (contains alerts) file.
    //
    //
    //

    cockpit
      .file(this.logFile, { max_read_size: 1024 * 1024 * 1024, superuser: 'try' })
      .read()
      .then((content) => {
        if (!content.includes('"event_type":"alert"')) return;
        const { isNew, rows, nrOfAlerts } = this.state;
        const newRows = rows['signature-table'];
        const newRowsCount = [];
        const jsonArray = content.split('\n').filter((x) => x.includes('"event_type":"alert"'));

        if (!isNew) {
          for (let i = 0; i < jsonArray.length; i += 1) {
            let entry;
            try {
              entry = this.pushAlert(JSON.parse(jsonArray[i]));
            } catch {
              console.log(jsonArray[i]);
            }
            if (entry != null) newRows.unshift(entry);
          }
        } else {
          jsonArray.forEach((el) => {
            const elObj = JSON.parse(el);
            if (elObj.event_type == 'alert') {
              newRows.unshift(this.pushAlert(elObj));
            }
          });

          this.setState({ isNew: false });
        }
        if (newRows.length != nrOfAlerts) {
          // Update if theres new entries
          /// Count alerts
          const counts = {};
          newRows.forEach((x) => {
            counts[x[5]] = (counts[x[5]] || 0) + 1;
          });

          Object.keys(counts).forEach((x) => {
            newRowsCount.push([x, counts[x]]);
          });
          // Count alerts
          rows['repeated-table'] = newRowsCount;
          rows['signature-table'] = newRows;

          this.setState({ nrOfAlerts: newRows.length, rows }, () => {
            this.updateSort('repeated-table');
            this.updateSort('repeated-table');
            // BUG needs to run updateSort() twice to avoid elements not being sorted correctly
          });
        }
      });
    cockpit.spawn(['tail', '-f', this.logFile], { superuser: 'try' }).stream((content) => {
      if (!content.includes('"event_type":"alert"')) return;
      const { isNew, rows, nrOfAlerts } = this.state;
      const newRows = rows['signature-table'];
      const newRowsCount = [];
      const jsonArray = content.split('\n').filter((x) => x.includes('"event_type":"alert"'));

      if (!isNew) {
        for (let i = 0; i < jsonArray.length; i += 1) {
          let entry;
          try {
            entry = this.pushAlert(JSON.parse(jsonArray[i]));
          } catch {
            console.log(jsonArray[i]);
          }
          if (entry != null) newRows.unshift(entry);
        }
      } else {
        jsonArray.forEach((el) => {
          const elObj = JSON.parse(el);
          if (elObj.event_type == 'alert') {
            newRows.unshift(this.pushAlert(elObj));
          }
        });

        this.setState({ isNew: false });
      }
      if (newRows.length != nrOfAlerts) {
        // Update if theres new entries
        /// Count alerts
        const counts = {};
        newRows.forEach((x) => {
          counts[x[5]] = (counts[x[5]] || 0) + 1;
        });

        Object.keys(counts).forEach((x) => {
          newRowsCount.push([x, counts[x]]);
        });
        // Count alerts
        rows['repeated-table'] = newRowsCount;
        rows['signature-table'] = newRows;

        this.setState({ nrOfAlerts: newRows.length, rows }, () => {
          this.updateSort('signature-table');
          this.updateSort('signature-table'); // BUG needs to run updateSort() twice to avoid elements not being sorted correctly
        });
      }
    });
  }

  render() {
    const { nrOfAlerts, columns, rows, columnsCount, sortBy, showNr } = this.state;

    return (
      <>
        <PageSection variant={PageSectionVariants.light}>
          <span>Number of alert: {nrOfAlerts}</span>
        </PageSection>
        <Card>
          <CardTitle>
            List of repeated alerts
            <CardBody>
              <Table
                aria-label="List of repeated alert table"
                id="repeated-table"
                sortBy={sortBy['repeated-table']}
                onSort={this.onSort}
                cells={columnsCount}
                rows={rows['repeated-table'].slice(0, showNr)}>
                <TableHeader />
                <TableBody />
              </Table>

              {rows['repeated-table'].length > showNr && (
                <EmptyState>
                  <Title size="lg" headingLevel="h4">
                    <Button onClick={() => this.setState({ showNr: showNr + 50 })}>
                      Click to expand
                    </Button>
                  </Title>
                </EmptyState>
              )}
            </CardBody>
          </CardTitle>

          <CardTitle>
            Alerts
            <CardBody>
              <Table
                aria-label="List of signatures alert table"
                size="sm"
                id="signature-table"
                sortBy={sortBy['signature-table']}
                onSort={this.onSort}
                cells={columns}
                rows={rows['signature-table'].slice(0, showNr)}>
                <TableHeader />
                <TableBody />
              </Table>
            </CardBody>
          </CardTitle>
        </Card>
        {rows['signature-table'].length > showNr && (
          <EmptyState>
            <Title size="lg" headingLevel="h4">
              <Button onClick={() => this.setState({ showNr: showNr + 50 })}>
                Click to expand
              </Button>
            </Title>
          </EmptyState>
        )}
      </>
    );
  }
}
