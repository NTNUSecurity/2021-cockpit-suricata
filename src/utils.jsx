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

import cockpit from 'cockpit';

export function getSuricataVersion() {
  return cockpit.spawn(['suricata', '--build-info'], { superuser: 'try' }).then((output) => {
    if (output.startsWith('This is Suricata version')) {
      return output.split(' ')[4];
    }
    return 'unknown';
  });
}

export function getTextData(_file) {
  return cockpit
    .file(_file, { max_read_size: 1024 * 1024 * 1024, superuser: 'try' })
    .read()
    .then((content, tag) => {
      if (tag != '-') {
        return content;
      }
      return null;
    });
}
