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

import './signatures.scss';
import './vars.jsx';

import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  Button,
  Dropdown,
  DropdownItem,
  DropdownToggle,
  FileUpload,
  Form,
  FormGroup,
  FormSection,
  Modal,
  ModalVariant,
  Nav,
  NavItem,
  NavList,
  PageSection,
  PageSectionVariants,
  Spinner,
  TextArea,
  TextInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import CaretDownIcon from '@patternfly/react-icons/dist/js/icons/caret-down-icon';
import EditIcon from '@patternfly/react-icons/dist/js/icons/edit-icon';
import FileIcon from '@patternfly/react-icons/dist/js/icons/file-alt-icon';
import FileUploadIcon from '@patternfly/react-icons/dist/js/icons/file-upload-icon';
import KeyIcon from '@patternfly/react-icons/dist/js/icons/key-icon';
import PlusIcon from '@patternfly/react-icons/dist/js/icons/plus-icon';
import TrashIcon from '@patternfly/react-icons/dist/js/icons/trash-alt-icon';
import {
  sortable,
  SortByDirection,
  Table,
  TableBody,
  TableHeader,
  TableVariant,
  wrappable,
} from '@patternfly/react-table';
import cockpit from 'cockpit';
import yaml from 'js-yaml';
import React from 'react';

import { getSuricataVersion, getTextData } from './utils.jsx';

const path = require('path');

const surUpdatePath = '/var/lib/suricata/update';

export class Signatures extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      activeItem: 0,
      alerts: [],
      columns: [
        { title: 'Action', transforms: [sortable] },
        { title: 'Source', transforms: [sortable, wrappable] },
        {
          title: 'Summary',
          transforms: [sortable],
        },
        { title: 'Description' },
        { title: 'License', transforms: [sortable, wrappable] },
        {
          title: 'Vendor',
          transforms: [sortable],
        },
      ],
      columns2: [
        { title: 'Action' },
        { title: 'Filename', transforms: [sortable] },
        { title: 'Signatures', transforms: [sortable, wrappable] },
      ],
      disabledList: [],
      dropOpen: [],
      dropOpenFile: false,
      enabledList: [],
      helperText: '',
      indexSource: {},
      invalidText: '',
      isDropdownOpen: {},
      isLoading: false,
      isModalOpen: [],
      isRejected: false,
      modalData: '',
      modalTitle: '',
      rows: [],
      rows2: [],
      signatureFile: '',
      sortBy: {},
      sourceName: '',
      surRulesPath: '',
      textInputValue: [],
      textInputValue1: '',
      validated: '',
    };

    this.handleChange = (_nil, event) => {
      let { isChecked } = this.state;
      const { id } = event.target;
      this.setState(() => {
        if (typeof isChecked[id] === 'undefined') {
          isChecked[id] = { enable: false };
        }
        isChecked[id].enable = !isChecked[id].enable;
        isChecked = { ...isChecked };
        return { isChecked };
      });
    };

    this.toggleFile = (dropOpenFile) => {
      this.setState({ dropOpenFile });
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

    this.toggle = (dropdownIndex) => {
      const { rows2, dropOpen } = this.state;
      dropOpen[dropdownIndex] = !dropOpen[dropdownIndex];
      rows2[dropdownIndex][0] = this.setupDropDownButton(dropdownIndex, dropOpen[dropdownIndex]);
      this.setState({ dropOpen, rows2 });
    };

    this.setupDropDownButton = (index, dropOpen) => (
      <>
        <Dropdown
          onSelect={this.onSelect}
          key="dropdown"
          isOpen={dropOpen}
          toggle={
            <DropdownToggle
              key="toggle-dropdown"
              id="toggle-id"
              onToggle={() => this.toggle(index)}
              toggleIndicator={CaretDownIcon}>
              <FileIcon />
            </DropdownToggle>
          }
          dropdownItems={[
            <DropdownItem
              key="edit"
              value="edit"
              slot={index}
              component="button"
              icon={<EditIcon />}>
              Edit file
            </DropdownItem>,
            <DropdownItem
              key="delete"
              value="delete"
              slot={index}
              component="button"
              icon={<TrashIcon />}>
              Delete file
            </DropdownItem>,
          ]}
        />
      </>
    );

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
        helperText: '',
        invalidText: '',
        isLoading: '',
        isRejected: '',
        modalData: '',
        modalTitle: '',
        signatureFile: '',
        sourceName: '',
        textInputValue: [],
        textInputValue1: '',
        validated: '',
      });
    };

    this.onSelect = (event) => {
      const { rows2, surRulesPath } = this.state;

      this.setState({
        isOpen: !this.isOpen,
      });
      if (event.target.value == 'edit') {
        const filename = rows2[event.target.slot][1];
        this.handleModalToggle(2);
        getTextData(`${surRulesPath}/${filename}`).then((content) => {
          this.clearStates();
          this.setState({
            modalData: content,
            modalTitle: filename,
            signatureFile: `${surRulesPath}/${filename}`,
          });
        });
      } else if (event.target.value == 'delete') {
        const filename = rows2[event.target.slot][1];
        this.handleModalToggle(3);
        this.setState({
          modalData: `Are you sure you want to delete "${filename}"?`,
          modalTitle: filename,
          signatureFile: `${surRulesPath}/${filename}`,
        });
      } else if (event.target.value == 'create') {
        this.clearStates();
        this.handleModalToggle(4);
      } else if (event.target.value == 'upload') {
        this.clearStates();
        this.handleModalToggle(5);
      }
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

    this.handleFileChange = (modalData, signatureFile, event) => {
      if (event.target.textContent === 'Clear') this.setState({ validated: false });
      this.setState({ isRejected: false, modalData, signatureFile });
    };
    this.handleFileRejected = () => this.setState({ isRejected: true });
    this.handleFileReadStarted = () => this.setState({ isLoading: true });
    this.handleFileReadFinished = () => this.setState({ isLoading: false, validated: true });

    this.handleModalToggle = (num) => {
      this.setState((prev) => {
        const isOpen = prev.isModalOpen;
        isOpen[num] = !isOpen[num];
        return { isModalOpen: isOpen };
      });
    };

    this.myID = (_nil, event) => {
      const { id } = event.target;
      return id;
    };

    this.handleTextInputChange = (value, event) => {
      const { textInputValue } = this.state;
      const { id } = event.target;
      this.setState(() => {
        textInputValue[id] = value;
        textInputValue[`${id}-hasChanged`] = true;
        return { textInputValue };
      });
    };
    this.handleTextInputChange1 = (value) => {
      this.setState({ textInputValue1: value });
    };

    this.handleTextAreaChange = (value) => {
      const { modalTitle } = this.state;
      this.setState({
        helperText: '',
        modalData: value,
        modalTitle: modalTitle.endsWith('*') ? modalTitle : modalTitle.concat('*'),
        validated: '',
      });
    };

    this.createSignatureFile = () => {
      const { textInputValue1, surRulesPath } = this.state;
      cockpit
        .spawn(['touch', `${surRulesPath}/${textInputValue1}`], { superuser: 'try' })
        .done(() => {
          this.addAlert(0, 'success', <span>Successfully created file: {textInputValue1}</span>);
        })
        .catch((error) => {
          this.addAlert(
            0,
            'danger',
            <>
              <div>
                <span>Failed creating file: {textInputValue1}</span>
              </div>
              <div>
                <span>Error: {error.message}</span>
              </div>
            </>,
          );
        });
    };

    this.uploadSignatureFile = () => {
      const { modalData, signatureFile, surRulesPath } = this.state;
      cockpit
        .file(`${surRulesPath}/${signatureFile}`, { superuser: 'try' })
        .replace(modalData)
        .done(() => {
          this.addAlert(0, 'success', <span>Successfully uploaded file: {signatureFile}</span>);
        })
        .fail((error) => {
          this.addAlert(
            0,
            'danger',
            <>
              <div>
                <span>Failed uploading file: {signatureFile}</span>
              </div>
              <div>
                <span>Error: {error.message}</span>
              </div>
            </>,
          );
        });
    };

    this.saveSignatureFile = () => {
      const { modalData, signatureFile, modalTitle } = this.state;
      cockpit
        .file(signatureFile, { superuser: 'try' })
        .replace(modalData)
        .done(() => {
          this.setState({
            helperText: 'Changes saved, please run suricata-update to apply the changes.',
            modalTitle: modalTitle.replace('*', ''),
            validated: 'success',
          });
        })
        .fail((error) => {
          this.setState({ invalidText: `Error: ${error}`, validated: 'error' });
        });
      if (modalData === '')
        cockpit.spawn(['touch', signatureFile], {
          superuser: 'try',
        });
    };
    this.deleteSignatureFile = () => {
      const { signatureFile } = this.state;
      const filename = path.basename(signatureFile);
      cockpit
        .file(signatureFile, { superuser: 'try' })
        .replace(null)
        .done(() => {
          this.addAlert(
            0,
            'success',
            <>
              <div>
                <span>Successfully deleted file: {filename}</span>
              </div>
            </>,
          );
        })
        .fail((error) => {
          this.addAlert(
            0,
            'danger',
            <>
              <div>
                <span>Failed deleting file: {filename}</span>
              </div>
              <div>
                <span>Error: {error.message}</span>
              </div>
            </>,
          );
        });
    };

    this.onSort = this.onSort.bind(this);
    this.onSort2 = this.onSort2.bind(this);
  }

  componentDidMount() {
    let rulesPath = '/etc/suricata/rules';
    cockpit
      .spawn(['/bin/ls', '/usr/share/suricata'], { superuser: 'try' })
      // By default suricata-update uses /usr/share/suricata/rules path to load distribution rule
      // Second default = /etc/suricata/rules
      .then(() => {
        rulesPath = '/usr/share/suricata/rules';
      })
      .catch(() => {})

      .done(() => {
        this.setState({ surRulesPath: rulesPath }, () => {
          this.updateTable();
          this.updateLocalFiles();
        });
      });
  }

  onSort(_event, index, direction) {
    const { rows } = this.state;
    let sortedRows = {};
    if (typeof rows[0][index] == 'object' && typeof buttonTexts !== 'undefined') {
      sortedRows = rows.sort((a, b) =>
        a[index].props.children[0].props.children < b[index].props.children[0].props.children
          ? -1
          : a[index].props.children[0].props.children > b[index].props.children[0].props.children
          ? 1
          : 0,
      );
    } else {
      sortedRows = rows.sort((a, b) => (a[index] < b[index] ? -1 : a[index] > b[index] ? 1 : 0));
    }
    this.setState({
      rows: direction === SortByDirection.asc ? sortedRows : sortedRows.reverse(),
      sortBy: {
        direction,
        index,
      },
    });
  }

  onSort2(_event, index, direction) {
    const { rows2 } = this.state;
    const sortedrows = rows2.sort((a, b) =>
      a[index] < b[index] ? -1 : a[index] > b[index] ? 1 : 0,
    );
    this.setState({
      rows2: direction === SortByDirection.asc ? sortedrows : sortedrows.reverse(),
      sortBy: {
        direction,
        index,
      },
    });
  }

  updateTable() {
    const newRows = [];
    let config;
    let { indexSource, enabledList, disabledList } = this.state;
    return getTextData(global.SuricataFullFilePath)
      .then((conf) => {
        config = yaml.load(conf);
      })

      .then(() => {
        if (typeof config['default-rule-path'] !== 'undefined') {
          const folderPath = `${surUpdatePath}/sources/`;
          return cockpit
            .spawn(['/bin/ls', folderPath], { superuser: 'try' })
            .then((output) => {
              disabledList = output
                .toString()
                .replaceAll('.yaml', '')
                .split('\n')
                .filter((el) => el != '');

              enabledList = disabledList.filter((el) => !el.endsWith('.disabled'));

              enabledList.forEach((el, index) => {
                enabledList[index] = el.replace('-', '/'); // Follow suricata-update naming scheme
              });
            })

            .catch(() => {});
        }
        return null;
      })

      .then(() => {
        if (typeof config['default-rule-path'] !== 'undefined')
          getTextData(`${surUpdatePath}/cache/index.yaml`).then((content) => {
            if (content === null) {
              this.addAlert(
                1,
                'warning',
                <>
                  <div>
                    <span>
                      Missing index.yaml file. Press the fetch vendors button to fix this.
                    </span>
                  </div>
                </>,
              );
            }
            if (content !== null) indexSource = yaml.load(content);
            // Load index.yaml if it exists
            else indexSource = { sources: {} }; // Create a temporary one to be able to show custom ones
            enabledList.forEach((key) => {
              // Custom vendors that are enabled does not list in index.yaml
              // Check for custom source/vendor
              if (typeof indexSource.sources[key] === 'undefined') {
                return getTextData(`${surUpdatePath}/sources/${key.replace('/', '-')}.yaml`).then(
                  (content2) => {
                    if (content2 != null) {
                      indexSource.sources[key] = yaml.load(content2);
                      indexSource.sources[key].custom = true;
                    }
                  },
                );
              }
              return null;
            });
            getSuricataVersion().then((surVersion) => {
              const objectSource = indexSource.sources;
              Object.keys(objectSource).forEach((key) => {
                objectSource[key].url = objectSource[key].url.replaceAll(
                  '%(__version__)s',
                  surVersion,
                );
                const alreadyExist = disabledList.includes(`${key.replace('/', '-')}.disabled`);
                const isPremium = objectSource[key].url.includes('%(secret-code)s');
                let statusButton = (
                  <div>
                    <Button
                      onClick={() => {
                        if (isPremium && !alreadyExist)
                          this.setState({ sourceName: key }, this.handleModalToggle(5));
                        else this.suricataUpdate(['enable-source', key], false);
                      }}
                      icon={isPremium && <KeyIcon />}>
                      Click to enable
                    </Button>
                    {alreadyExist && isPremium && (
                      <>
                        <Tooltip content="Delete secret code stored.">
                          <div>
                            <Button
                              onClick={() => {
                                this.suricataUpdate(['remove-source', key], false);
                              }}
                              variant="link"
                              style={{ display: 'inline' }}>
                              Delete secret code
                            </Button>
                          </div>
                        </Tooltip>
                      </>
                    )}
                  </div>
                );
                enabledList.forEach((name) => {
                  if (key == name) {
                    let text = 'Click to disable';
                    if (objectSource[key].custom) text = 'Click to remove';
                    const action = text == 'Click to disable' ? 'disable' : 'remove';
                    statusButton = (
                      <div>
                        <Button
                          style={{ backgroundColor: 'green', color: 'white' }}
                          variant="success"
                          onClick={() => this.suricataUpdate([`${action}-source`, key], false)}>
                          {text}
                        </Button>
                      </div>
                    );
                  }
                });
                newRows.push([
                  statusButton,
                  <>
                    <a href={objectSource[key].url}>{key}</a>
                  </>,
                  objectSource[key].summary,
                  objectSource[key].description,
                  objectSource[key].license,
                  objectSource[key].vendor,
                ]);
              });
              this.setState({ enabledList, rows: newRows });
            });
          });
      });
  }

  countSignatures(txt) {
    return txt
      .split('\n')
      .filter((el) => !el.startsWith('#'))
      .filter((el) => el != '').length;
  }

  updateLocalFiles() {
    const { dropOpen, surRulesPath } = this.state;
    const newRows = [];
    cockpit
      .spawn(['/bin/ls', surRulesPath], { superuser: 'try' })
      .then((output) => {
        const localFiles = output
          .toString()
          .split('\n')
          .filter((el) => el != ''); // Remove empty array
        localFiles.forEach((el, index) => {
          getTextData(`${surRulesPath}/${el}`).then((content) => {
            if (content != null)
              newRows[index] = [
                this.setupDropDownButton(index, dropOpen[index]),
                el,
                this.countSignatures(content),
              ];
            this.setState(() => ({ rows2: newRows }));
          });
        });
      })
      .catch(() => {});
  }

  suricataUpdate(command, isApplying) {
    const { enabledList } = this.state;
    let exec = ['suricata-update'];
    if (enabledList.length == 0 && command.length == 0) exec = exec.concat(['--url', '']);
    // Prevent et/open to be enabled by default.
    // This is a feature not a bug according to suricata team.
    // https://github.com/OISF/suricata-update/commit/4f5f6060d91dbae0107754ba3ed91712312f2456#diff-93a164f3299a195e0276166ef6035c24c1dd7c58ae0dac7d7b39b103a6dd0dda

    exec = exec.concat(command);
    this.setState({
      modalTitle: `${exec.toString().replaceAll(',', ' ')}:`,
    });
    cockpit
      .spawn(exec, { superuser: 'try' })
      .stream((data) => {
        this.setState({ modalData: data });
      })
      .done(() => {
        if (isApplying) this.addAlert(-1, 'success', 'Finished applying changes.');
        this.updateTable();
      })
      .catch((error) => {
        this.addAlert(
          -1,
          'danger',
          <>
            <div>
              <span>Failed applying changes.</span>
            </div>
            <div>
              <span>Error: {error.message}</span>
            </div>
          </>,
        );
      });
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

  render() {
    const {
      textInputValue1,
      textInputValue,
      dropOpenFile,
      columns,
      rows,
      columns2,
      rows2,
      modalData,
      sortBy,
      alerts,
      isModalOpen,
      activeItem,
      modalTitle,
      validated,
      helperText,
      invalidText,
      isLoading,
      isRejected,
      signatureFile,
      sourceName,
    } = this.state;

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

    const vendors = (
      <>
        <Modal
          title="Add custom vendor form"
          id="modal-box-suricata-form"
          variant={ModalVariant.small}
          isOpen={isModalOpen[1]}
          onClose={() => {
            this.clearStates();
            this.handleModalToggle(1);
          }}
          actions={[
            <Button
              key="add-source"
              variant="primary"
              isDisabled={
                !(
                  textInputValue['simple-form-section-1-input'] != '' &&
                  textInputValue['simple-form-section-2-input'] != '' &&
                  /^https?:\/\//.test(textInputValue['simple-form-section-2-input'])
                )
              }
              onClick={() => {
                this.handleModalToggle(1);
                this.suricataUpdate(
                  [
                    'add-source',
                    textInputValue['simple-form-section-1-input'],
                    textInputValue['simple-form-section-1-input'],
                  ],
                  false,
                );
                this.updateTable();
                this.clearStates();
              }}>
              Submit
            </Button>,
            <Button
              key="close"
              variant="secondary"
              onClick={() => {
                this.handleModalToggle(1);
                this.clearStates();
              }}>
              Cancel
            </Button>,
          ]}>
          <Form>
            <FormSection>
              <FormGroup label="Name of vendor" isRequired fieldId="simple-form-section-1-input">
                {this.setupTextInput('simple-form-section-1-input', 1)}
              </FormGroup>
              <FormGroup
                label="Source URL (http/https)"
                isRequired
                fieldId="simple-form-section-2-input">
                {this.setupTextInput('simple-form-section-2-input', 2)}
              </FormGroup>
            </FormSection>
          </Form>
        </Modal>

        <Modal
          id="modal-box-suricata-create-file"
          variant={ModalVariant.small}
          isOpen={isModalOpen[5]}
          onClose={() => {
            this.handleModalToggle(5);
            this.setState({ textInputValue1: '' });
          }}
          actions={[
            <Button
              variant="primary"
              onClick={() => {
                this.suricataUpdate(
                  ['enable-source', sourceName, `secret-code=${textInputValue1}`],
                  false,
                );
                this.handleModalToggle(5);
                this.clearStates();
              }}
              size="lg"
              isDisabled={textInputValue1 == ''}
              id="apply-changes">
              {' '}
              Click to enable
            </Button>,
            <Button
              variant="secondary"
              onClick={() => {
                this.handleModalToggle(5);
                this.setState({ textInputValue1: '' });
              }}
              size="lg"
              id="apply-changes">
              Cancel
            </Button>,
          ]}>
          <Form>
            <FormSection>
              <FormGroup label="Secret code:" isRequired fieldId="simple-form-section-1-input">
                <TextInput
                  isRequired
                  type="section-1-input"
                  id="simple-form-section-1-input"
                  name="simple-form-section-1-input"
                  value={textInputValue1}
                  isValid={validated}
                  onChange={this.handleTextInputChange1}
                />
              </FormGroup>
            </FormSection>
          </Form>
        </Modal>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button
                variant="primary"
                onClick={() => {
                  this.handleModalToggle(1);
                }}
                size="lg"
                id="start-button">
                Add custom vendor
              </Button>{' '}
              <Button
                variant="primary"
                onClick={() => {
                  this.setState({ modalData: '' });
                  this.handleModalToggle(0);
                  this.suricataUpdate('update-sources', false);
                }}
                size="lg"
                id="start-button">
                Fetch vendors
              </Button>{' '}
            </ToolbarItem>
            <ToolbarItem variant="pagination" align={{ default: 'alignRight' }}>
              <Tooltip content="Applies changes done to vendor list.">
                <Button
                  variant="primary"
                  onClick={() => {
                    this.clearStates();
                    this.handleModalToggle(0);
                    this.suricataUpdate([], true);
                  }}
                  size="lg"
                  id="start-button">
                  Apply changes
                </Button>{' '}
              </Tooltip>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        {rows.length > 0 && (
          <Table
            style={{ overflow: 'wrap' }}
            variant={TableVariant.compact}
            aria-label="Vendors"
            sortBy={sortBy}
            onSort={this.onSort}
            cells={columns}
            rows={rows}>
            <TableHeader />
            <TableBody />
          </Table>
        )}
      </>
    );

    const localRules = (
      <>
        <Modal
          title={modalTitle}
          id="modal-box-suricata-edit-file"
          variant={ModalVariant.large}
          isOpen={isModalOpen[2]}
          onClose={() => {
            this.handleModalToggle(2);
            this.setState({ modalData: '' });
            this.updateLocalFiles();
          }}
          actions={[
            <Button
              variant="primary"
              onClick={this.saveSignatureFile}
              size="lg"
              id="apply-changes"
              isDisabled={!modalTitle.endsWith('*')}>
              Save changes
            </Button>,
          ]}>
          <Form>
            <FormGroup
              type="string"
              helperText={helperText}
              helperTextInvalid={invalidText}
              validated={validated}>
              <TextArea
                value={modalData}
                onChange={this.handleTextAreaChange}
                validated={validated}
                isRequired
                aria-label="invalid text area example"
                id="suricata-config-area"
              />
            </FormGroup>
          </Form>
        </Modal>

        <Modal
          id="modal-box-suricata-delete-file"
          variant={ModalVariant.small}
          isOpen={isModalOpen[3]}
          onClose={() => {
            this.handleModalToggle(3);
            this.setState({ modalData: '', modalTitle: '' });
          }}
          actions={[
            <Button
              variant="primary"
              onClick={() => {
                this.deleteSignatureFile();
                this.handleModalToggle(3);
                this.updateLocalFiles();
              }}
              size="lg"
              id="apply-changes">
              Yes
            </Button>,
            <Button
              variant="primary"
              onClick={() => {
                this.handleModalToggle(3);
                this.setState({ modalData: '', modalTitle: '' });
              }}
              size="lg"
              id="apply-changes">
              No
            </Button>,
          ]}>
          {modalData}
        </Modal>

        <Modal
          id="modal-box-suricata-create-file"
          variant={ModalVariant.small}
          isOpen={isModalOpen[4]}
          onClose={() => {
            this.handleModalToggle(4);
            this.setState({ textInputValue1: '' });
          }}
          actions={[
            <Button
              variant="primary"
              onClick={() => {
                this.createSignatureFile();
                this.handleModalToggle(4);
                this.updateLocalFiles();
              }}
              size="lg"
              isDisabled={!(/\W/.test(textInputValue1) && textInputValue1.endsWith('.rules'))}
              id="apply-changes">
              {' '}
              Create
            </Button>,
            <Button
              variant="secondary"
              onClick={() => {
                this.handleModalToggle(4);
                this.setState({ textInputValue1: '' });
              }}
              size="lg"
              id="apply-changes">
              Cancel
            </Button>,
          ]}>
          <Form>
            <FormSection>
              <FormGroup label="Filename (.rules)" isRequired fieldId="simple-form-section-1-input">
                <TextInput
                  isRequired
                  type="section-1-input"
                  id="simple-form-section-1-input"
                  name="simple-form-section-1-input"
                  value={textInputValue1}
                  isValid={validated}
                  onChange={this.handleTextInputChange1}
                />
              </FormGroup>
            </FormSection>
          </Form>
        </Modal>

        <Modal
          id="modal-box-suricata-upload-file"
          variant={ModalVariant.medium}
          isOpen={isModalOpen[5]}
          onClose={() => {
            this.handleModalToggle(5);
            this.clearStates();
          }}
          actions={[
            <Button
              variant="primary"
              onClick={() => {
                this.uploadSignatureFile();
                this.handleModalToggle(5);
                this.updateLocalFiles();
              }}
              size="lg"
              isDisabled={!validated}
              id="apply-changes">
              Upload
            </Button>,
            <Button
              variant="secondary"
              onClick={() => {
                this.handleModalToggle(5);
                this.clearStates();
              }}
              size="lg"
              id="apply-changes">
              Cancel
            </Button>,
          ]}>
          <Form>
            <FormGroup
              fieldId="text-file-with-restrictions"
              helperText="Upload a .rules file"
              helperTextInvalid="Must be a .rules file"
              validated={isRejected ? 'error' : 'default'}>
              <FileUpload
                id="text-file-with-restrictions"
                type="text"
                hideDefaultPreview={!validated}
                value={modalData}
                filename={signatureFile}
                onChange={this.handleFileChange}
                onReadStarted={this.handleFileReadStarted}
                onReadFinished={this.handleFileReadFinished}
                isLoading={isLoading}
                dropzoneProps={{
                  accept: '.rules',
                  maxSize: 1024 * 1024 * 1024,
                  onDropRejected: this.handleFileRejected,
                }}
                validated={isRejected ? 'error' : 'default'}
              />
            </FormGroup>
          </Form>
        </Modal>

        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Dropdown
                onSelect={this.onSelect}
                key="dropdown"
                isOpen={dropOpenFile}
                toggle={
                  <DropdownToggle
                    key="toggle-dropdown"
                    id="toggle-id"
                    onToggle={this.toggleFile}
                    toggleIndicator={CaretDownIcon}>
                    File
                  </DropdownToggle>
                }
                dropdownItems={[
                  <DropdownItem key="create" value="create" component="button" icon={<PlusIcon />}>
                    Create file
                  </DropdownItem>,
                  <DropdownItem
                    key="upload"
                    value="upload"
                    component="button"
                    icon={<FileUploadIcon />}>
                    Upload file
                  </DropdownItem>,
                ]}
              />
            </ToolbarItem>
            <ToolbarItem variant="pagination" align={{ default: 'alignRight' }}>
              <Tooltip content="Applies changes done to local files.">
                <Button
                  variant="primary"
                  onClick={() => {
                    this.clearStates();
                    this.handleModalToggle(0);
                    this.suricataUpdate([], true);
                  }}
                  size="lg"
                  id="start-button">
                  Apply changes
                </Button>{' '}
              </Tooltip>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
        <Table
          style={{ overflow: 'wrap' }}
          variant={TableVariant.compact}
          aria-label="Local files"
          sortBy={sortBy}
          onSort={this.onSort2}
          cells={columns2}
          rows={rows2}>
          <TableHeader />
          <TableBody />
        </Table>
      </>
    );

    this.renderSwitchTab = (item) => {
      switch (item) {
        case 0:
          return localRules;
        case 1:
          return vendors;
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
          title={modalData === '' ? '' : modalTitle}
          id="modal-box-suricata-update"
          variant={ModalVariant.large}
          isOpen={isModalOpen[0]}
          onClose={() => {
            this.handleModalToggle(0);
            this.clearStates();
          }}
          actions={[]}>
          {(modalData === '' && (
            <div style={{ height: '200px' }}>
              <Spinner id="output-spinner" isSVG diameter="80px" />
            </div>
          )) || <span id="modal-suricata-update-text">{modalData}</span>}
        </Modal>
        <PageSection variant={PageSectionVariants.light}>
          <Nav onSelect={this.onSelectTab} variant="tertiary">
            <NavList>
              <NavItem key={0} itemId={0} isActive={activeItem === 0}>
                Local rules
              </NavItem>
              <NavItem key={1} itemId={1} isActive={activeItem === 1}>
                Vendors
              </NavItem>
            </NavList>
          </Nav>
        </PageSection>
        {this.renderSwitchTab(activeItem)}
      </>
    );
  }
}
