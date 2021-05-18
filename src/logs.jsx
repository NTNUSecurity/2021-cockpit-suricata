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

// Used code from journal.js and cockpit-components-logs.jsx made by cockpit

import './logs.scss';

import {
  Bullseye,
  Button,
  Card,
  CardBody,
  Checkbox,
  DatePicker,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  FormSelect,
  FormSelectOption,
  isValidDate,
  PageSection,
  PageSectionVariants,
  Tab,
  Tabs,
  TabTitleText,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import CaretDownIcon from '@patternfly/react-icons/dist/js/icons/caret-down-icon';
import OutlinedQuestionCircleIcon from '@patternfly/react-icons/dist/js/icons/outlined-question-circle-icon';
import SearchIcon from '@patternfly/react-icons/dist/js/icons/search-icon';
import { Table, TableBody, TableHeader, TableVariant } from '@patternfly/react-table';
import cockpit from 'cockpit';
import { journal } from 'journal';
import React from 'react';

const _ = cockpit.gettext;

export class Logs extends React.Component {
  constructor() {
    super();

    this.logs = [];
    this.state = {
      datePick: [
        { time: undefined, date: '', dateShow: '' },
        { time: undefined, date: '', dateShow: '' },
      ],
      compareRow: [],

      matches: [],
      dropDownText: 'Everything',
      activeTabKey: 0,
      isOpen: false,
      logs: [],
      outputLimit: 10,

      filters: {
        date: [],
        time: [],
        counter: [],
        TMName: [],
      },
      columns: [{ title: 'Counter' }, { title: 'Value' }, { title: 'TM Name' }],
      rows: [],
      statsLog: {},
      showLiveStats: true,
    };

    this.handleTabClick = (_event, tabIndex) => {
      this.setState({
        activeTabKey: tabIndex,
      });
    };

    this.onToggle = (isOpen) => {
      this.setState({
        isOpen,
      });
    };

    this.statsObj = [];
    this.matches = [];
  }

  componentDidMount() {
    this.reStream({});
    this.watchFile();
  }

  componentWillUnmount() {
    this.journalctl.stop();
    this.tail.close();
  }

  reStream(match) {
    this.logs = [];
    this.setState({ logs: [], isOpen: false }, () => {
      if (typeof this.journalctl != 'undefined') this.journalctl.stop();
      this.journalctl = journal.journalctl('_SYSTEMD_UNIT=suricata.service', {
        ...match,
        count: 'all',
      });
      const render = journal.renderer(this);

      this.journalctl.stream((entries) => {
        entries.forEach((entry) => render.prepend(entry));
        render.prepend_flush();
        this.setState({ logs: this.logs });
      });
    });
  }

  watchFile() {
    const dateNr = 1;
    const timeNr = 5;
    const me = this;
    const statsFilePath = '/var/log/suricata/stats.log';
    const date = new Date();
    date.setHours(0, 0, 0);

    cockpit
      .file(statsFilePath, { max_read_size: 1024 * 1024 * 1024, superuser: 'try' })
      .read()
      .then((data) => {
        const { statsLog, datePick } = this.state;
        let { matches } = this.state;

        const lines = data.split('\n').slice(0, -1);
        date.setHours(0, 0, 0);
        datePick[0].date = date;
        lines.forEach((line) => {
          if (line.includes('Date:')) {
            matches = line.match(/((\d{1,2})\/(\d{1,2})\/(\d{4})) -- ((\d{2}):(\d{2}):(\d{2}))/);
            datePick[0].dateShow = matches[dateNr];
            datePick[0].time = matches[timeNr];
          } else if (typeof matches[1] != 'undefined' && matches[5] != 'undefined') {
            if (!line.includes('-------') && !line.includes('Counter')) {
              const cntNameValue = line.replace(/\s/g, '').split('|');

              if (typeof statsLog[matches[1]] == 'undefined') statsLog[matches[1]] = [];
              if (typeof statsLog[matches[1]][matches[5]] == 'undefined')
                statsLog[matches[1]][matches[5]] = [];

              statsLog[matches[1]][matches[5]].push([
                cntNameValue[0],
                cntNameValue[2],
                cntNameValue[1],
              ]);
            }
          }
        });
        if (typeof matches[1] != 'undefined' && matches[5] != 'undefined')
          if (typeof statsLog[matches[1]][matches[5]] != 'undefined')
            this.setState({ rows: statsLog[matches[1]][matches[5]], statsLog, matches, datePick });
      });

    me.tail = cockpit.spawn(['tail', '-f', statsFilePath], { superuser: 'try' }).stream((data) => {
      const { statsLog, showLiveStats, datePick } = this.state;
      let { matches } = this.state;

      const lines = data.split('\n').slice(0, -1);

      lines.forEach((line) => {
        if (line.includes('Date:')) {
          matches = line.match(/((\d{1,2})\/(\d{1,2})\/(\d{4})) -- ((\d{2}):(\d{2}):(\d{2}))/);
          if (showLiveStats) {
            datePick[0].dateShow = matches[dateNr];
            datePick[0].time = matches[timeNr];
            date.setDate(new Date().getDate());
            date.setHours(0, 0, 0);
            datePick[0].date = date;
          }
        } else if (typeof matches[dateNr] != 'undefined' && matches[timeNr] != 'undefined') {
          if (!line.includes('-------') && !line.includes('Counter')) {
            const cntNameValue = line.replace(/\s/g, '').split('|');

            if (typeof statsLog[matches[1]] == 'undefined') statsLog[matches[1]] = [];
            if (typeof statsLog[matches[1]][matches[5]] == 'undefined')
              statsLog[matches[1]][matches[5]] = [];

            statsLog[matches[1]][matches[5]].push([
              cntNameValue[0],
              cntNameValue[2],
              cntNameValue[1],
            ]);
          }
        }
      });
      if (typeof matches[1] != 'undefined' && matches[5] != 'undefined')
        if (typeof statsLog[matches[1]][matches[5]] != 'undefined')
          if (showLiveStats)
            me.setState({ rows: statsLog[matches[1]][matches[5]], statsLog, matches, datePick });
          else me.setState({ statsLog, matches, datePick });
    });
  }

  prepend(item) {
    this.logs.unshift(item);
  }

  append(item) {
    this.logs.push(item);
  }

  remove_first() {
    this.logs.shift();
  }

  remove_last() {
    this.logs.pop();
  }

  render_reboot_separator() {
    this.reboot_key += 1;
    return (
      <div className="cockpit-logline" role="row" key={`reboot-${this.reboot_key}`}>
        <div className="cockpit-log-warning" role="cell" />
        <span className="cockpit-log-message cockpit-logmsg-reboot" role="cell">
          {_('Reboot')}
        </span>
      </div>
    );
  }

  render_day_header(day) {
    return (
      <div className="panel-heading" key={day}>
        {day}
      </div>
    );
  }

  render_line(ident, prio, message, count, time, entry) {
    let problem = false;
    let warning = false;

    if (ident === 'abrt-notification') {
      problem = true;
      // eslint-disable-next-line no-param-reassign
      ident = entry.PROBLEM_BINARY;
    } else if (prio < 4) {
      warning = true;
    }

    return (
      <div className="cockpit-logline" role="row" tabIndex="0" key={entry.CURSOR}>
        <div className="cockpit-log-warning" role="cell">
          {warning ? <i className="fa fa-exclamation-triangle" /> : null}
          {problem ? <i className="fa fa-times-circle-o" /> : null}
        </div>
        <div className="cockpit-log-time" role="cell">
          {time}
        </div>
        <span className="cockpit-log-message" role="cell">
          {message}
        </span>
        {count > 1 ? (
          <div className="cockpit-log-service-container" role="cell">
            <div className="cockpit-log-service-reduced" role="cell">
              {ident}
            </div>
            <span className="badge" role="cell">
              {count}&#160;
              <i className="fa fa-caret-right" />
            </span>
          </div>
        ) : (
          <div className="cockpit-log-service" role="cell">
            {ident}
          </div>
        )}
      </div>
    );
  }

  render() {
    const {
      showLiveStats,
      compareRow,
      outputLimit,
      matches,
      isOpen,
      activeTabKey,
      loading,
      columns,
      filters,
      datePick,
      statsLog,
      dropDownText,
      logs,
    } = this.state;
    const { emptyMessage } = this.props;

    let { rows } = this.state;

    const dateParse = (date) => {
      const split = date.split('/');
      if (split.length !== 3) {
        return new Date();
      }
      const month = split[0];
      const day = split[1];
      const year = split[2];
      return new Date(
        `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`,
      );
    };

    const dateFormat = (date) =>
      date.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });

    // https://stackoverflow.com/questions/16637051/adding-space-between-numbers
    function numberWithSpaces(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    }

    const onFromChange = (_str, date) => {
      const time = 0;
      if (isValidDate(date)) {
        date.setDate(date.getDate());
        datePick[0].date = date;
        datePick[0].dateShow = dateFormat(date);
        if (
          typeof statsLog[datePick[0].dateShow] != 'undefined' &&
          typeof statsLog[datePick[0].dateShow][datePick[0].time] != 'undefined'
        ) {
          datePick[0].time = Object.keys(statsLog[datePick[0].dateShow])[time];
          this.setState({ datePick, rows: statsLog[datePick[0].dateShow][datePick[0].time] });
        } else this.setState({ datePick, rows: [] });
      } else {
        datePick[0].dateShow = '';
      }
    };

    const onToChange = (_str, date) => {
      const time = 0;

      if (isValidDate(date)) {
        date.setDate(date.getDate());
        datePick[1].date = date;
        datePick[1].dateShow = dateFormat(date);
        if (typeof statsLog[datePick[1].dateShow] != 'undefined') {
          datePick[1].time = Object.keys(statsLog[datePick[1].dateShow])[time];
          this.setState({ datePick, compareRow: statsLog[datePick[1].dateShow][datePick[1].time] });
        } else this.setState({ datePick, compareRow: [] });
      } else {
        datePick[1].dateShow = '';
      }
    };

    const selectFromChange = (item) => {
      datePick[0].time = item;
      this.setState({ rows: statsLog[datePick[0].dateShow][item], matches });
    };

    const selectToChange = (item) => {
      datePick[1].time = item;
      this.setState({ compareRow: statsLog[datePick[1].dateShow][item], matches });
    };

    if (
      !showLiveStats &&
      datePick[0].dateShow != '' &&
      datePick[1].dateShow != '' &&
      Array.isArray(compareRow)
    ) {
      const newRow = [];
      rows.forEach((item) => {
        let compareItem = '';
        let exists = false;
        let diff = 0;
        compareRow.forEach((item2) => {
          if (item[0] == item2[0]) {
            exists = true;
            compareItem = item2;
            diff = item2[1] - item[1];
          }
        });
        if (diff != 0)
          newRow.push([
            item[0],
            `From ${numberWithSpaces(item[1])} to ${numberWithSpaces(
              compareItem[1],
            )} (diff: ${numberWithSpaces(diff)})`,
            item[2],
          ]);
        else if (exists)
          newRow.push([
            item[0],
            `From ${numberWithSpaces(item[1])} to ${numberWithSpaces(compareItem[1])}`,
            item[2],
          ]);
        else newRow.push([item[0], `From ${numberWithSpaces(item[1])} to 0`, item[2]]);
      });

      compareRow.forEach((item) => {
        let compareItem = '';
        let exists = false;
        let diff = 0;
        rows.forEach((item2) => {
          if (item[0] == item2[0]) {
            exists = true;
            compareItem = item2;
            diff = item2[1] - item[1];
          }
        });
        if (diff != 0)
          newRow.push([
            item[0],
            `From ${numberWithSpaces(item[1])} to ${numberWithSpaces(
              compareItem[1],
            )} (diff: ${numberWithSpaces(diff)})`,
            item[2],
          ]);
        else if (exists)
          newRow.push([
            item[0],
            `From ${numberWithSpaces(item[1])} to ${numberWithSpaces(compareItem[1])}`,
            item[2],
          ]);
        else newRow.push([item[0], `From 0 to ${numberWithSpaces(item[1])}`, item[2]]);
      });

      rows = newRow;
    } else {
      const newRow = [];

      rows.forEach((item) => {
        newRow.push([item[0], numberWithSpaces(item[1]), item[2]]);

        rows = newRow;
      });
    }

    const dropdownItems = [
      <DropdownItem id="everything" key="everything" onClick={() => this.reStream({})}>
        Everything
      </DropdownItem>,
      <DropdownItem
        id="current-boot"
        key="current boot"
        component="button"
        onClick={() => this.reStream({ boot: 0 })}>
        Current boot
      </DropdownItem>,
      <DropdownItem
        id="previous-boot"
        key="previous boot"
        component="button"
        onClick={() => this.reStream({ boot: -1 })}>
        Previous boot
      </DropdownItem>,
      <DropdownItem
        id="last-24-hours"
        key="last 24 hours"
        onClick={() => {
          this.reStream({ since: '24 hours ago' });
        }}>
        Last 24 hours
      </DropdownItem>,
      <DropdownItem
        id="last-7-days"
        key="last 7 days"
        component="button"
        onClick={() => {
          this.reStream({ since: '7 days ago' });
        }}>
        Last 7 days
      </DropdownItem>,
    ];

    const journalLogsTab = [
      <PageSection key="section-dropdown">
        <Dropdown
          onSelect={this.onSelect}
          toggle={
            <DropdownToggle id="toggle-id" onToggle={this.onToggle} toggleIndicator={CaretDownIcon}>
              {dropDownText}
            </DropdownToggle>
          }
          isOpen={isOpen}
          dropdownItems={dropdownItems}
        />
      </PageSection>,
      <PageSection key="section-log-panel" id="section-log-panel">
        <Card className="cockpit-log-panel">
          <CardBody
            className={!logs.length && emptyMessage.length ? 'empty-message' : 'contains-list'}>
            {logs.length && outputLimit ? logs.slice(0, outputLimit) : emptyMessage}
          </CardBody>
        </Card>

        {logs.length > outputLimit && (
          <Button
            id="load-more"
            variant="primary"
            onClick={() => this.setState({ outputLimit: outputLimit + 10 })}>
            Load earlier entries
          </Button>
        )}
      </PageSection>,
    ];

    const filteredRows =
      filters.date.length > 0 ||
      filters.time.length > 0 ||
      filters.counter.length > 0 ||
      filters.TMName.length > 0
        ? rows.filter(
            (row) =>
              (filters.date.length === 0 ||
                filters.date.some((date) => row[0].toLowerCase().includes(date.toLowerCase()))) &&
              (filters.time.length === 0 ||
                filters.time.some((time) => row[1].toLowerCase().includes(time.toLowerCase()))) &&
              (filters.counter.length === 0 ||
                filters.counter.some((counter) =>
                  row[2].toLowerCase().includes(counter.toLowerCase()),
                )) &&
              (filters.TMName.length === 0 ||
                filters.TMName.some((TMName) =>
                  row[4].toLowerCase().includes(TMName.toLowerCase()),
                )),
          )
        : rows;

    let tableRows = filteredRows;
    if (!loading && filteredRows.length === 0) {
      tableRows = [
        {
          heightAuto: true,
          cells: [
            {
              props: { colSpan: 8 },
              title: (
                <Bullseye>
                  <EmptyState>
                    <EmptyStateIcon icon={SearchIcon} />
                    <Title headingLevel="h5" size="lg">
                      No logs found
                    </Title>
                    <EmptyStateBody>
                      No logs found on this date. Try changing the dates and time.
                    </EmptyStateBody>
                    <EmptyStateSecondaryActions />
                  </EmptyState>
                </Bullseye>
              ),
            },
          ],
        },
      ];
    } else if (loading) {
      tableRows = [
        {
          heightAuto: true,
          cells: [
            {
              props: { colSpan: 8 },
              title: (
                <Title headingLevel="h2" size="3xl">
                  Please wait while loading data
                </Title>
              ),
            },
          ],
        },
      ];
    }

    return (
      <>
        <PageSection variant={PageSectionVariants.light}>
          <Tabs activeKey={activeTabKey} onSelect={this.handleTabClick}>
            <Tab eventKey={0} title={<TabTitleText>suricata.service</TabTitleText>}>
              {journalLogsTab}
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>stats.log</TabTitleText>}>
              <>
                <Toolbar id="toolbar-with-chip-groups" collapseListedFiltersBreakpoint="xl">
                  <ToolbarContent>
                    <ToolbarGroup>
                      <ToolbarItem>
                        <DatePicker
                          dateFormat={dateFormat}
                          isDisabled={showLiveStats}
                          value={datePick[0].dateShow}
                          onChange={onFromChange}
                          aria-label="Start date"
                          placeholder="mm/dd/yyyy"
                          dateParse={dateParse}
                        />
                      </ToolbarItem>
                      <ToolbarItem>
                        <span>to</span>
                      </ToolbarItem>
                      <ToolbarItem>
                        <DatePicker
                          value={datePick[1].dateShow}
                          dateFormat={dateFormat}
                          onChange={onToChange}
                          isDisabled={showLiveStats}
                          rangeStart={datePick[0].date}
                          aria-label="End date"
                          placeholder="mm/dd/yyyy"
                          dateParse={dateParse}
                        />
                      </ToolbarItem>
                    </ToolbarGroup>
                  </ToolbarContent>
                  <ToolbarContent>
                    <ToolbarGroup>
                      <ToolbarItem>
                        <FormSelect
                          isDisabled={showLiveStats}
                          value={datePick[0].time}
                          onChange={selectFromChange}
                          aria-label="FormSelect Input">
                          {typeof statsLog[datePick[0].dateShow] != 'undefined' &&
                            Object.keys(statsLog[datePick[0].dateShow]).map((option) => (
                              <FormSelectOption
                                isDisabled={option.disabled}
                                key={option}
                                value={option}
                                label={option}
                              />
                            ))}
                        </FormSelect>
                      </ToolbarItem>
                      <ToolbarItem>
                        <span>to</span>
                      </ToolbarItem>
                      <ToolbarItem>
                        <FormSelect
                          isDisabled={showLiveStats}
                          value={datePick[1].time}
                          onChange={selectToChange}
                          aria-label="FormSelect Input">
                          {typeof statsLog[datePick[1].dateShow] != 'undefined' &&
                            Object.keys(statsLog[datePick[1].dateShow]).map((option) => (
                              <FormSelectOption
                                isDisabled={option.disabled}
                                key={option}
                                value={option}
                                label={option}
                              />
                            ))}
                        </FormSelect>
                      </ToolbarItem>
                    </ToolbarGroup>
                  </ToolbarContent>
                </Toolbar>

                <div style={{ display: 'block ruby' }}>
                  <Checkbox
                    id="checkbox-live-update"
                    label="Update table live"
                    aria-label="Checkbox with body example"
                    isChecked={showLiveStats}
                    onChange={() => {
                      this.setState({ showLiveStats: !showLiveStats });
                    }}
                  />
                  <Tooltip
                    position="right"
                    content={<div>Update table when &quot;stats.log&quot; file have changed.</div>}>
                    <span style={{ 'padding-left': '5px' }}>
                      <OutlinedQuestionCircleIcon size="sm" />
                    </span>
                  </Tooltip>
                </div>

                <Table
                  cells={columns}
                  rows={tableRows}
                  onSelect={this.onRowSelect}
                  variant={TableVariant.compact}
                  aria-label="Filterable Table Demo">
                  <TableHeader />
                  <TableBody />
                </Table>
              </>
            </Tab>
          </Tabs>
        </PageSection>
      </>
    );
  }
}

Logs.defaultProps = {
  emptyMessage: ['No logs'],
};
