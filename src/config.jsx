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

import './config.scss';
import './vars.jsx';

import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  Button,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  ExpandableSection,
  Form,
  FormGroup,
  Modal,
  ModalVariant,
  Nav,
  NavItem,
  NavList,
  PageSection,
  PageSectionVariants,
  Switch,
  TextArea,
  TextInput,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import CaretDownIcon from '@patternfly/react-icons/dist/js/icons/caret-down-icon';
import PlusIcon from '@patternfly/react-icons/dist/js/icons/plus-icon';
import TrashIcon from '@patternfly/react-icons/dist/js/icons/trash-alt-icon';
import {
  applyCellEdits,
  cancelCellEdits,
  EditableTextCell,
  Table,
  TableBody,
  TableHeader,
  TableVariant,
  validateCellEdits,
} from '@patternfly/react-table';
import cockpit from 'cockpit';
import yaml from 'js-yaml';
import React from 'react';
import ReactDOMServer from 'react-dom/server';

import { getTextData } from './utils.jsx';

const path = require('path');
const _ = require('lodash');

export class Config extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isModalOpen: [],
      textInputValue: [],
      validations: {
        local: new RegExp('^(/[^/ ]*S*)+/?$'),
        sources: /^https?:\/\//,
        vars: { 'address-groups': RegExp(''), 'port-groups': RegExp('') },
      },
      validationsErrorText: {
        local: 'Not a valid unix file path',
        sources: 'Not a valid url (http(s))',
      },
      rows: { local: [], sources: [], ...global.suricataYamlTables },
      updateYamlChanges: false,
      configDropSelect: '',
      activeItem: 0,
      alerts: [],
      isChecked: [],
      isDropdownOpen: {},
      surUptConf: {
        'disable-conf': '/etc/suricata/disable.conf',
        'drop-conf': '/etc/suricata/drop.conf',
        'enable-conf': '/etc/suricata/enable.conf',
        'modify-conf': '/etc/suricata/modify.conf',
      },
      validated: '',
    };

    [...global.updateYamlKeys, ...global.suricataYamlKeys].forEach((el) => {
      const { isChecked } = this.state;
      isChecked[el] = { ...isChecked[el], enable: false };
      this.setState(isChecked);
    });
    ['/etc/suricata/suricata.yaml', '/etc/suricata/update.yaml'].forEach((filePath) => {
      getTextData(filePath).then((content) => {
        const { textInputValue, isChecked, rows } = this.state;

        // Directly edit
        textInputValue[`${path.basename(filePath)}-file`] = content;
        textInputValue[`${path.basename(filePath)}-file-comment`] = filePath;

        /* const disabled = content
          .split('\n')
          .filter((el) => /^#.*:/.test(el)) // Filter out non-commented text out
          .filter((el) => !/ - .*:/.test(el)) // Clear examples
          .filter((el) => !/^.*: \[.*\]/.test(el)) // Clear arrays
          .toString()
          .replaceAll(',', '\n')
          .replaceAll('#', ''); */
        const disabledArrays = {};
        /* content
          .split('\n')
          .filter((el) => /^#.*:/.test(el)) // Filter out non-commented text out
          .filter((el) => !/ - .*:/.test(el)) // Clear examples
          .filter((el) => /^.*: \[.*\]/.test(el)) // Clear arrays
          .toString()
          .replaceAll('],', ']\n')
          .replaceAll('#', '')
          .split('\n')
          .filter((el) => el != '') // Remove empty arrays
          .forEach((el) => {
            const key = el.replace(/: \[.*\]/, '');
            const arr = el.replace(/.*: \[/, '[');
            // disabledArrays[key] = JSON.parse(arr);
          });
          */
        let disabledYaml = '';
        disabledYaml = { ...disabledArrays, ...disabledYaml };
        let { surUptConf } = this.state;
        const uptConfig = yaml.load(content);
        global.fakeArray.forEach((str) => {
          if (typeof _.get(uptConfig, str) == 'object')
            _.set(uptConfig, str, _.get(uptConfig, str).toString());
        });
        this.setState((prevState) => {
          if (uptConfig !== null) {
            surUptConf = { ...prevState.surUptConf, ...uptConfig };
            Object.keys(surUptConf).forEach((el) => {
              if (typeof uptConfig[el] !== 'undefined') {
                this.setupSwitchRecursive(uptConfig, [el], true);
                textInputValue[el] = surUptConf[el];
                isChecked[el] = { ...isChecked[el], enable: true };
              }
            });
          }
          if (typeof disabledYaml != 'undefined')
            Object.keys(disabledYaml).forEach((el) => {
              textInputValue[el] = disabledYaml[el];
            });

          return { surUptConf, textInputValue, isChecked, uptConfig, rows };
        });
      });
    });

    // Update row id on each cell to be correct to avoid duplicate trash buttons
    this.updateTable = (id) => {
      const { rows } = this.state;
      this.setState((prevState) => {
        const newRows = [];
        Object.keys(_.get(prevState.rows, id)).forEach((el) => {
          const cells = [];
          Object.keys(_.get(prevState.rows, [...id, el]).cells).forEach((cell) => {
            cells.push(_.get(prevState.rows, [...id, el]).cells[cell].props.value);
          });
          newRows.push(this.setupNewRow(cells, el, id));
        });
        _.set(rows, id, newRows);
        return { rows: { ...prevState.rows, [id]: newRows } };
      });
    };

    this.handleChange = (_nil, event, el) => {
      const id = typeof event == 'object' ? event.target.id : '';
      let { isChecked } = this.state;
      this.setState(() => {
        if (typeof el != 'undefined') {
          _.set(isChecked, el, !_.get(isChecked, el));
        } else {
          if (typeof isChecked[id] === 'undefined') {
            isChecked[id] = { enable: false };
          }
          isChecked[id].enable = !isChecked[id].enable;
          isChecked = { ...isChecked };
        }
        return { isChecked };
      });
    };

    this.toggleDropdown = (_nil, event) => {
      let { isDropdownOpen } = this.state;
      const { id } = event.target;
      this.setState(() => {
        if (typeof isDropdownOpen[id] === 'undefined') {
          isDropdownOpen[id] = { enable: false };
        }
        isDropdownOpen[id].enable = !isDropdownOpen[id].enable;
        isDropdownOpen = { ...isDropdownOpen };
        return { isDropdownOpen };
      });
    };

    this.onToggle = (num) => {
      const { isOpen } = this.state;
      this.setState((prev) => {
        if (typeof isOpen[num] === 'undefined') isOpen[num] = true;
        else isOpen[num] = !prev.isOpen[num];
        return { isOpen };
      });
    };

    this.clearStates = () => {
      this.setState({
        textInputValue: [],
        validated: '',
      });
    };

    this.onSelect = (_event) => {
      this.setState({
        isOpen: !this.isOpen,
      });
      this.onFocus();
    };

    this.onFocus = () => {
      const element = document.getElementById('toggle-id');
      element.focus();
    };

    this.onSelectTab = (result) => {
      this.setState({
        activeItem: result.itemId,
      });
    };

    this.handleTextInputChange = (value, event, el) => {
      const { textInputValue } = this.state;
      const { id } = event.target;
      this.setState(() => {
        if (typeof el != 'undefined') _.set(textInputValue, el, value);
        else textInputValue[id] = value;
        textInputValue[`${id}-hasChanged`] = true;
        return { textInputValue };
      });
    };

    this.toggleModal = (id) => {
      const { isModalOpen } = this.state;
      this.setState((prevState) => {
        isModalOpen[id] = !prevState.isModalOpen[id];
        return { isModalOpen };
      });
    };

    this.simulateNetworkCall = (callback) => {
      setTimeout(callback, 2000);
    };

    this.handleYamlTextInputChange = (value, event) => {
      const { textInputValue } = this.state;
      const { id } = event.target;
      textInputValue[`${id}-helperText`] = 'Validating...';
      textInputValue[`${id}-validated`] = 'default';
      textInputValue[`${id}-hasChanged`] = false;
      textInputValue[id] = value;
      this.setState(
        {
          textInputValue,
        },
        this.simulateNetworkCall(() => {
          if (value && value.length > 0) {
            try {
              yaml.load(value);
              textInputValue[`${id}-helperText`] = 'Valid YAML';
              textInputValue[`${id}-validated`] = 'success';
              textInputValue[`${id}-hasChanged`] = true;
            } catch (e) {
              textInputValue[`${id}-invalidText`] = `Invalid YAML: ${e.message}`;
              textInputValue[`${id}-validated`] = 'error';
              textInputValue[`${id}-hasChanged`] = false;
            }
            this.setState({ textInputValue });
          }
        }),
      );
    };

    this.getMyTableId = (evt) => {
      let el = evt.target;
      while (el.parentElement != undefined) {
        el = el.parentElement;
        if (el.tagName == 'TABLE') return el.id;
      }
      return null;
    };

    this.handleCellTextInputChange = (newValue, evt, rowIndex, cellIndex) => {
      const { rows } = this.state;
      const id = this.getMyTableId(evt);
      const newRows = Array.from(rows[id]);
      newRows[rowIndex].cells[cellIndex].props.editableValue = newValue;
      if (typeof newRows[rowIndex].cells[cellIndex].props.value == 'undefined')
        newRows[rowIndex].cells[cellIndex].props.value = '';
      this.setState({
        rows: { ...rows, [id]: newRows },
      });
    };

    this.saveYamlFile = (filePath, keys) => {
      const { textInputValue, isChecked } = this.state;
      // Copy array values displayed into their respective objects
      /* keys.forEach((key) => {
        if (Array.isArray(rows[key])) {
          const dataArray = [];
          rows[key].forEach((el) => {
            dataArray.push(el.cells[0].props.value);
          });
          if (isChecked[key].enable) textInputValue[key] = dataArray;
          else textInputValue[key] = JSON.stringify(dataArray);
        }
      }); */

      let content;
      let disabled = '\n'; // Act as an placeholder to hold disabled content
      keys.forEach((el) => {
        if (typeof textInputValue[el] !== 'undefined')
          if (isChecked[el].enable) {
            content = { [el]: textInputValue[el], ...content };
          } else if (textInputValue[el] != '') disabled += `#${el}: ${textInputValue[el]}\n`;
      });
      global.fakeArray.forEach((str) => {
        if (typeof _.get(content, str) != 'undefined')
          _.set(content, str, _.get(textInputValue, str).split(','));
      });
      try {
        content = yaml.dump(content);
        if (disabled != '\n') content += disabled;
      } catch (error) {
        this.addAlert(
          -1,
          'danger',
          <>
            <div>
              <span>Failed saving file: {filePath}</span>
            </div>
            <div>
              <span>Error: {error.message}</span>
            </div>
          </>,
        );
      }
      cockpit
        .file(filePath, { superuser: 'try' })
        .replace(content)
        .done(() => {
          this.setState({ updateYamlChanges: false });
        })
        .fail((error) => {
          this.addAlert(
            0,
            'danger',
            <>
              <div>
                <span>Failed saving file: {filePath}</span>
              </div>
              <div>
                <span>Error: {error.message}</span>
              </div>
            </>,
          );
        });
    };

    this.saveConfigFile = (filepath, id) => {
      const { textInputValue } = this.state;
      cockpit
        .file(filepath, { superuser: 'try' })
        .replace(textInputValue[id])
        .done(() => {
          textInputValue[`${id}-hasChanged`] = false;
          this.setState({ textInputValue });
        })
        .fail((error) => {
          this.addAlert(
            0,
            'danger',
            <>
              <div>
                <span>Failed saving file: {filepath}</span>
              </div>
              <div>
                <span>Error: {error.message}</span>
              </div>
            </>,
          );
        });
    };
  }

  // Apply new elements when finished rendering
  componentDidUpdate() {
    this.setupRecursiveTrash(global.suricataYamlTablesColumns, []);
  }

  addAlert(activeItem, variant, title) {
    const { alerts } = this.state;
    this.setState({
      alerts: [...alerts, { active: activeItem, key: new Date().getTime(), title, variant }],
    });
  }

  deleteAlert(index) {
    const { alerts } = this.state;
    alerts[index] = null;
    this.setState({
      alerts: [...alerts.filter((el) => el.key !== index)],
    });
  }

  addTrashToTable(id) {
    const { rows, textInputValue } = this.state;
    try {
      _.get(rows, id).forEach((_el, index) => {
        const button = (
          <Button className="pf-c-button pf-m-plain" id={`${id}deleteButton${index}`}>
            <TrashIcon />
          </Button>
        );
        const deleteButton = document.createElement('div');
        deleteButton.style.width = '0px';
        deleteButton.onclick = () => {
          // Delete element from table displayed
          _.set(
            rows,
            id,
            _.get(rows, id).filter((_nil, i) => i !== index),
          );
          // Delete element from object list
          const copy = _.get(textInputValue, id);
          const newObject = {};
          Object.keys(copy).forEach((item, loopIndex) => {
            if (index !== loopIndex) {
              newObject[item] = copy[item];
            }
          });

          _.set(textInputValue, id, newObject);

          this.setState(
            () => ({
              rows,
              updateYamlChanges: true,
              textInputValue,
            }),
            () => {
              this.updateTable(id);
            },
          );
        };
        deleteButton.innerHTML = ReactDOMServer.renderToString(button);
        if (
          document.getElementById(`${id}row${index}`) != null &&
          document.getElementById(`${id}deleteButton${index}`) == null
        )
          document.getElementById(`${id}row${index}`).parentElement.appendChild(deleteButton);
      });
    } catch {
      return null;
    }
    return null;
  }

  render() {
    const {
      textInputValue,
      alerts,
      isDropdownOpen,
      activeItem,
      validated,
      surUptConf,
      configDropSelect,
      updateYamlChanges,
      isChecked,
      rows,
      validations,
      validationsErrorText,
      isModalOpen,
    } = this.state;
    // Setup delete button for table that patternfly does not currently have
    this.updateEditableRows = (evt, type, _isEditable, rowIndex, validationErrors) => {
      const id = this.getMyTableId(evt);
      const newRows = rows[id];

      if (validationErrors && Object.keys(validationErrors).length) {
        newRows[rowIndex] = validateCellEdits(newRows[rowIndex], type, validationErrors);
        this.setState({ rows: { ...rows, [id]: newRows } });
        return;
      }

      if (type === 'cancel') {
        newRows[rowIndex] = cancelCellEdits(newRows[rowIndex]);
        this.setState({ rows: { ...rows, [id]: newRows } });
        return;
      }
      if (newRows[rowIndex].isEditable) this.setState({ updateYamlChanges: true });
      newRows[rowIndex] = applyCellEdits(newRows[rowIndex], type);

      this.setState({ rows: { ...rows, [id]: newRows } });
    };

    this.updateEditableRowsnew = (evt, type, _isEditable, rowIndex, validationErrors) => {
      const id = this.getMyTableId(evt);

      const newRows = _.get(rows, id);

      if (validationErrors && Object.keys(validationErrors).length) {
        newRows[rowIndex] = validateCellEdits(newRows[rowIndex], type, validationErrors);
        this.setState({ rows: { ...rows, [id]: newRows } });
        return;
      }

      if (type === 'cancel') {
        newRows[rowIndex] = cancelCellEdits(newRows[rowIndex]);
        this.setState({ rows: { ...rows, [id]: newRows } });
        return;
      }
      if (newRows[rowIndex].isEditable) this.setState({ updateYamlChanges: true });
      newRows[rowIndex] = applyCellEdits(newRows[rowIndex], type);

      this.setState({ rows: { ...rows, [id]: newRows } });
    };

    this.setupTextInput = (id, index) => (
      <TextInput
        isRequired
        type={`section-${index}-input`}
        id={id}
        name={id}
        value={textInputValue[id]}
        onChange={this.handleTextInputChange}
      />
    );

    this.configTab = () => {
      let filePath;
      if (configDropSelect === '') {
        this.setState({ configDropSelect: 'enable-conf' });
      }

      // Make sure config files tab gets correct files
      if (typeof isChecked[configDropSelect] != 'undefined' && isChecked[configDropSelect].enable)
        filePath = textInputValue[configDropSelect];
      else filePath = surUptConf[configDropSelect];
      if (typeof textInputValue[`${configDropSelect}-file`] === 'undefined')
        return getTextData(filePath).then((conf) => {
          this.setState(
            () => {
              if (conf == null) textInputValue[`${configDropSelect}-file`] = null;
              else textInputValue[`${configDropSelect}-file`] = conf;
              return { textInputValue };
            },
            () => {
              if (conf == null && filePath != surUptConf[configDropSelect])
                this.addAlert(
                  -1,
                  'danger',
                  <span>The file: {filePath} does not exist or can&apos;t be read.</span>,
                );
            },
          );
        });
      return (
        <>
          <PageSection variant={PageSectionVariants.light}>
            <Toolbar>
              <ToolbarGroup>
                <ToolbarItem>
                  <Dropdown
                    onSelect={(itemSelect) => {
                      this.setState({
                        configDropSelect: itemSelect.target.parentElement.id,
                      });
                      isDropdownOpen['config-file-dropdown'].enable = false;
                    }}
                    toggle={
                      <DropdownToggle
                        id="config-file-dropdown"
                        onToggle={this.toggleDropdown}
                        toggleIndicator={CaretDownIcon}>
                        {path.basename(filePath)}
                      </DropdownToggle>
                    }
                    isOpen={
                      typeof isDropdownOpen['config-file-dropdown'] !== 'undefined'
                        ? isDropdownOpen['config-file-dropdown'].enable
                        : false
                    }
                    dropdownItems={global.updateYamlConfigFiles.map((el, i) => (
                      <DropdownItem component="button" id={el} key={i.toString()}>
                        {isChecked[el].enable
                          ? path.basename(textInputValue[el])
                          : path.basename(surUptConf[el])}
                      </DropdownItem>
                    ))}
                  />
                </ToolbarItem>
                <Tooltip
                  content={
                    <>
                      <div>Save changes to &quot;{path.basename(filePath)}&quot; file.</div>
                      <div>
                        NOTE: Suricata service has to be restarted for changes to take effect.
                      </div>
                    </>
                  }>
                  <ToolbarItem>
                    <Button
                      isDisabled={!textInputValue[`${configDropSelect}-file-hasChanged`]}
                      onClick={() => this.saveConfigFile(filePath, configDropSelect)}>
                      Save changes
                    </Button>
                  </ToolbarItem>
                </Tooltip>
              </ToolbarGroup>
            </Toolbar>
            <span style={{ color: 'red' }}>
              NB: There is no syntax checking here, so invalid config text will be saved.
            </span>
            <TextArea
              value={
                textInputValue[`${configDropSelect}-file`] == null
                  ? ''
                  : textInputValue[`${configDropSelect}-file`]
              }
              onChange={this.handleTextInputChange}
              validated={validated}
              isRequired
              aria-label="Text area"
              id={`${configDropSelect}-file`}
            />
          </PageSection>
        </>
      );
    };

    this.setupNewRow = (text, index, id) => {
      let cells = [];
      if (Array.isArray(text))
        text.forEach((txt) => {
          cells.push({
            title: (value, rowIndex, cellIndex, props_) => (
              <EditableTextCell
                value={value}
                rowIndex={rowIndex}
                cellIndex={cellIndex}
                props={props_}
                handleTextInputChange={this.handleCellTextInputChange}
                inputAriaLabel={txt}
              />
            ),
            props: {
              value: txt,
              name: 'uniqueIdRow1Cell',
              id: `${id}row${index}`,
            },
          });
        });
      else {
        cells = [
          {
            title: (value, rowIndex, cellIndex, props_) => (
              <EditableTextCell
                value={value}
                rowIndex={rowIndex}
                cellIndex={cellIndex}
                props={props_}
                handleTextInputChange={this.handleCellTextInputChange}
                inputAriaLabel={text}
              />
            ),
            props: {
              value: text,
              name: 'uniqueIdRow1Cell1',
              id: `${id}row${index}`,
            },
          },
        ];
      }
      return {
        rowEditBtnAriaLabel: (idx) => `Edit row ${idx}`,
        rowSaveBtnAriaLabel: (idx) => `Save edits for row ${idx}`,
        rowCancelBtnAriaLabel: (idx) => `Cancel edits for row ${idx}`,
        rowEditValidationRules: [
          {
            name: 'required',
            validator: (value) =>
              typeof _.get(validations, id) != 'undefined'
                ? _.get(validations, id).test(value)
                : new RegExp(),
            errorText: validationsErrorText[id],
          },
        ],
        cells,
      };
    };

    this.setupSwitch = (id) => (
      <span>
        <Switch
          id={id}
          isChecked={typeof isChecked[id] !== 'undefined' ? isChecked[id].enable : false}
          onChange={(_nil, e) => {
            this.handleChange(undefined, e);
            this.setState({ updateYamlChanges: true });
          }}
        />
      </span>
    );

    this.directlySaveYamlFile = (filePath, id) => {
      if (yaml.load(textInputValue[id]))
        cockpit
          .file(filePath, { superuser: 'try' })
          .replace(textInputValue[id])
          .done(() => {
            textInputValue[`${id}-comment`] = filePath;
            textInputValue[`${id}-helperText`] =
              'Changes saved, please restart Suricata to apply the changes.';
            textInputValue[`${id}-hasChanged`] = false;
            this.setState({ textInputValue });
          })
          .fail((error) => {
            textInputValue[`${id}-invalidText`] = `Error: ${error}`;
            textInputValue[`${id}-validated`] = 'error';
            this.setState({ textInputValue });
          });
    };

    this.editableYaml = (filePath, id) => (
      <>
        <PageSection>
          <Form>
            <FormGroup
              label={textInputValue[`${id}-comment`]}
              type="string"
              helperText={textInputValue[`${id}-helperText`]}
              helperTextInvalid={textInputValue[`${id}-invalidText`]}
              validated={textInputValue[`${id}-validated`]}>
              <TextArea
                value={textInputValue[id]}
                onChange={this.handleYamlTextInputChange}
                isRequired
                validated={validated}
                aria-label="invalid text area example"
                id={id}
              />
            </FormGroup>
          </Form>
          <Toolbar>
            <ToolbarGroup>
              <Tooltip
                content={
                  <>
                    <div>Save changes to &quot;{path.basename(filePath)}&quot; file.</div>
                    <div>
                      NOTE: Suricata service has to be restarted for changes to take effect.
                    </div>
                  </>
                }>
                <ToolbarItem>
                  <Button
                    variant="primary"
                    onClick={() => this.directlySaveYamlFile(filePath, id)}
                    size="lg"
                    isDisabled={!textInputValue[`${id}-hasChanged`]}
                    id="apply-changes">
                    Save changes
                  </Button>{' '}
                </ToolbarItem>
              </Tooltip>
            </ToolbarGroup>
          </Toolbar>
        </PageSection>
      </>
    );

    this.setupSwitchRecursive = (obj, objPath, state) => {
      const select = _.get(obj, objPath);
      if (typeof select == 'object' && select != null)
        Object.keys(select).forEach((el) => {
          if (typeof _.get(obj, [...objPath, el]) == 'object')
            this.setupSwitchRecursive(obj, [...objPath, el], state);
          else {
            _.set(isChecked, [...objPath, el], state);
          }
        });
      this.setState({ isChecked });
    };

    this.setupRecursiveTrash = (obj, objPath) => {
      if (Array.isArray(obj)) this.addTrashToTable(objPath);
      else
        Object.keys(obj).forEach((el) => {
          if (typeof _.get(obj, el) == 'object')
            this.setupRecursiveTrash(_.get(obj, el), [...objPath, el]);
        });
    };

    this.setupRecursiveObject = (label, id, objPath, tooltipText, content, indent) => {
      const select = _.get(textInputValue, objPath);
      if (_.get(textInputValue, objPath) != null)
        if (typeof _.get(textInputValue, objPath) == 'object') {
          Object.keys(_.get(textInputValue, objPath)).forEach((el) => {
            const build = [];
            const selectEl = _.get(textInputValue, [...objPath, el]);
            if (typeof _.get(global.suricataYamlTables, objPath) == 'object') {
              let chosen = [...objPath, el];
              if (/^[0-9]*$/.test(el)) chosen = objPath;
              if (el >= 1) return;
              if (_.get(rows, chosen).length == 0)
                Object.keys(_.get(textInputValue, chosen)).forEach((el2) => {
                  if (/^[0-9]*$/.test(el2)) {
                    if (typeof _.get(textInputValue, chosen)[el2] == 'object') {
                      const buildArr = [];
                      _.get(global.suricataYamlTablesColumns, chosen).forEach((el3) => {
                        buildArr.push(_.get(textInputValue, [...chosen, el2, el3.toLowerCase()]));
                      });
                      _.get(rows, chosen).push(
                        this.setupNewRow(buildArr, _.get(rows, chosen).length, chosen),
                      );
                    } else {
                      _.get(rows, chosen).push(
                        this.setupNewRow(
                          _.get(textInputValue, [...objPath, el2]),
                          _.get(rows, chosen).length,
                          chosen,
                        ),
                      );
                    }
                  } else
                    _.get(rows, chosen).push(
                      this.setupNewRow([el2, selectEl[el2]], _.get(rows, chosen).length, [
                        ...objPath,
                        el,
                      ]),
                    );
                });
              if (!/^[0-9]*$/.test(el))
                content.push(
                  <div
                    style={{
                      'padding-left': `${indent}em`,
                      'padding-top': '0.5em',
                      'padding-bottom': '0.5em',
                      fontWeight: 'bold',
                    }}>
                    {typeof _.get(global.suricataYamlTitles, chosen) != 'undefined'
                      ? _.get(global.suricataYamlTitles, chosen)
                      : el}
                    :
                  </div>,
                );
              build.push(
                <>
                  <Table
                    id={chosen.toString().replaceAll(',', '.')}
                    onRowEdit={this.updateEditableRowsnew}
                    aria-label="Editable Rows Table"
                    variant={TableVariant.compact}
                    cells={_.get(global.suricataYamlTablesColumns, chosen)}
                    rows={_.get(rows, chosen)}>
                    <TableHeader />
                    <TableBody />
                  </Table>
                  <Button
                    icon={<PlusIcon />}
                    variant="none"
                    className="pf-c-button pf-c-plain"
                    onClick={() => {
                      const emptyBlocks = [];
                      _.times(_.get(global.suricataYamlTablesColumns, chosen).length, () =>
                        emptyBlocks.push(''),
                      );
                      _.get(rows, chosen).push(
                        this.setupNewRow(emptyBlocks, _.get(rows, chosen).length, chosen),
                      );
                      this.setState({ rows }, () => {
                        this.addTrashToTable(chosen);
                      });
                    }}
                  />
                </>,
              );
            } else if (typeof _.get(textInputValue, [...objPath, el]) == 'object') {
              if (!/^[0-9]*$/.test(el))
                content.push(
                  <div
                    style={{
                      'padding-left': `${indent}em`,
                      'padding-top': '0.5em',
                      'padding-bottom': '0.5em',
                      fontWeight: 'bold',
                    }}>
                    {typeof _.get(global.suricataYamlTitles, [...objPath, el]) != 'undefined'
                      ? _.get(global.suricataYamlTitles, [...objPath, el])
                      : el}
                    :
                  </div>,
                );
              this.setupRecursiveObject(
                label,
                id,
                [...objPath, el],
                tooltipText,
                content,
                indent + 1,
              );
            } else if (!Array.isArray(select))
              build.push(
                <div>
                  {el}:
                  <TextInput
                    id={id}
                    isReadOnly={!isChecked[id].enable}
                    value={_.get(textInputValue, [...objPath, el])}
                    onChange={(nil, e) => {
                      this.handleTextInputChange(nil, e, [...objPath, el]);
                      this.setState({ updateYamlChanges: true });
                    }}
                  />
                </div>,
              );
            else {
              build.push(
                <div
                  style={{
                    'padding-top': '0.2em',
                    'padding-bottom': '0.2em',
                  }}>
                  <span>
                    <Switch
                      isChecked={
                        typeof _.get(isChecked, [...objPath, el]) !== 'undefined'
                          ? _.get(isChecked, [...objPath, el])
                          : false
                      }
                      onChange={(_nil, _e) => {
                        this.handleChange(undefined, undefined, [...objPath, el]);
                        this.setState({ updateYamlChanges: true });
                      }}
                    />
                  </span>
                  {selectEl}
                </div>,
              );
            }
            content.push(
              <PageSection
                style={{
                  'padding-left': `${indent + 1}em`,
                  'padding-top': '0px',
                  'padding-bottom': '0px',
                }}>
                {build}
              </PageSection>,
            );
          });
        } else if (typeof select == 'string')
          content.push(
            <div style={{}}>
              <TextInput
                id={id}
                isReadOnly={!isChecked[`${id}`].enable}
                value={_.get(textInputValue, [...objPath])}
                onChange={(nil, e) => {
                  this.handleTextInputChange(nil, e, [...objPath]);
                  this.setState({ updateYamlChanges: true });
                }}
              />
            </div>,
          );
      if (content.length == 1)
        // If obj only has one element
        return (
          <Tooltip content={<div>{tooltipText}</div>}>
            <FormGroup
              label={
                typeof _.get(global.suricataYamlTablesTitles, label) != 'undefined'
                  ? _.get(global.suricataYamlTablesTitles, label)
                  : label
              }
              labelIcon={this.setupSwitch(id)}>
              <PageSection>{content}</PageSection>
            </FormGroup>
          </Tooltip>
        );
      return (
        <Tooltip content={<div>{tooltipText}</div>}>
          <FormGroup label={label} labelIcon={this.setupSwitch(id)}>
            <PageSection>
              <ExpandableSection toggleTextExpanded="Show Less" toggleTextCollapsed="Show More">
                {content}
              </ExpandableSection>
            </PageSection>
          </FormGroup>
        </Tooltip>
      );
    };

    const suricataYaml = (
      <>
        <PageSection variant={PageSectionVariants.light}>
          <Toolbar>
            <ToolbarGroup>
              <Tooltip
                content={
                  <>
                    <div>Save changes to &quot;update.yaml&quot; file.</div>
                    <div>
                      NOTE: Suricata service has to be restarted for changes to take effect.
                    </div>
                  </>
                }>
                <ToolbarItem>
                  <Button
                    isDisabled={!updateYamlChanges}
                    onClick={() => {
                      this.saveYamlFile('/etc/suricata/suricata.yaml', global.suricataYamlKeys);
                    }}>
                    Save changes
                  </Button>
                </ToolbarItem>
              </Tooltip>
              <ToolbarItem>
                <Tooltip
                  content={
                    <>
                      <div>
                        Opens a modal window with editable textbox with the file&apos;s content.
                      </div>
                    </>
                  }>
                  <Button onClick={() => this.toggleModal('modal-config-box')}>
                    Edit directly
                  </Button>
                </Tooltip>
              </ToolbarItem>
            </ToolbarGroup>
          </Toolbar>
          <Form id="suricata-yaml-page">
            {global.suricataYamlKeys.map((key) =>
              this.setupRecursiveObject(key, key, [key], key, [], 0),
            )}
          </Form>
        </PageSection>
      </>
    );
    const updateYaml = (
      <>
        <PageSection variant={PageSectionVariants.light}>
          <Toolbar>
            <ToolbarGroup>
              <Tooltip
                content={
                  <>
                    <div>Save changes to &quot;update.yaml&quot; file.</div>
                    <div>
                      NOTE: Suricata service has to be restarted for changes to take effect.
                    </div>
                  </>
                }>
                <ToolbarItem>
                  <Button
                    isDisabled={!updateYamlChanges}
                    onClick={() => {
                      this.saveYamlFile('/etc/suricata/update.yaml', global.updateYamlKeys);
                    }}>
                    Save changes
                  </Button>
                </ToolbarItem>
              </Tooltip>
              <ToolbarItem>
                <Tooltip
                  content={
                    <>
                      <div>
                        Opens a modal window with editable textbox with the file&apos;s content.
                      </div>
                    </>
                  }>
                  <Button onClick={() => this.toggleModal('modal-config-box')}>
                    Edit directly
                  </Button>
                </Tooltip>
              </ToolbarItem>
            </ToolbarGroup>
          </Toolbar>
          <Form id="update-yaml-page">
            {global.updateYamlKeys.map((key) =>
              this.setupRecursiveObject(key, key, [key], key, [], 0),
            )}
          </Form>
        </PageSection>
      </>
    );

    this.renderSwitchTab = (item) => {
      switch (item) {
        case 0:
          return suricataYaml;
        case 1:
          return updateYaml;
        case 2:
          return this.configTab();
        default:
          return null;
      }
    };

    return (
      <>
        <AlertGroup isToast>
          {alerts.map(({ active, key, variant, title }) =>
            active == activeItem || active == -1 ? (
              <Alert
                key={key}
                isLiveRegion
                variant={variant}
                title={title}
                actionClose={<AlertActionCloseButton onClose={() => this.deleteAlert(key)} />}
              />
            ) : (
              <></>
            ),
          )}
        </AlertGroup>

        <Modal
          id="modal-config-box"
          variant={ModalVariant.large}
          isOpen={isModalOpen['modal-config-box']}
          onClose={() => this.toggleModal('modal-config-box')}
          actions={[]}>
          {activeItem != 0
            ? this.editableYaml('/etc/suricata/update.yaml', 'update.yaml-file')
            : this.editableYaml('/etc/suricata/suricata.yaml', 'suricata.yaml-file')}
        </Modal>

        <PageSection variant={PageSectionVariants.light}>
          <Nav onSelect={this.onSelectTab} variant="tertiary">
            <NavList>
              <NavItem key={0} itemId={0} isActive={activeItem === 0}>
                suricata.yaml
              </NavItem>
              <NavItem key={1} itemId={1} isActive={activeItem === 1}>
                update.yaml
              </NavItem>
              <NavItem key={2} itemId={2} isActive={activeItem === 2}>
                suricata-update config files
              </NavItem>
            </NavList>
          </Nav>
        </PageSection>
        {this.renderSwitchTab(activeItem)}
      </>
    );
  }
}
