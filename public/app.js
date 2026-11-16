// Browser code only calls the Express API; MongoDB commands stay on the server.
const API = '/api/allocations';
const form = document.querySelector('#allocationForm');
const dialog = document.querySelector('#allocationDialog');
const rows = document.querySelector('#allocationRows');
const emptyState = document.querySelector('#emptyState');
const formError = document.querySelector('#formError');
const filterIds = ['searchInput', 'departmentFilter', 'buildingFilter', 'dayFilter', 'roomFilter', 'capacityMin', 'capacityMax', 'startAfter', 'endBefore', 'sortBy'];
let editingId = null;
let descending = false;
let allRecords = [];
let toastTimer;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function colorForDepartment(department) {
  // A repeatable color keeps every department visually consistent between refreshes.
  let hash = 0;
  for (const character of department) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `dept-color-${hash % 6}`;
}

async function request(url, options = {}) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'The request could not be completed.');
  return data;
}

function filtersToQuery() {
  const params = new URLSearchParams();
  const mapping = { searchInput: 'search', departmentFilter: 'department', buildingFilter: 'building', dayFilter: 'day', roomFilter: 'roomNumber', capacityMin: 'capacityMin', capacityMax: 'capacityMax', startAfter: 'startAfter', endBefore: 'endBefore', sortBy: 'sortBy' };
  for (const [id, key] of Object.entries(mapping)) {
    const value = document.getElementById(id).value.trim();
    if (value) params.set(key, value);
  }
  params.set('order', descending ? 'desc' : 'asc');
  return params.toString();
}

function updateSummary(records) {
  const departments = new Set(records.map((item) => item.department));
  const rooms = new Set(records.map((item) => `${item.building}|${item.roomNumber}`));
  const average = records.length ? Math.round(records.reduce((sum, item) => sum + item.capacity, 0) / records.length) : 0;
  document.querySelector('#totalStat').textContent = records.length;
  document.querySelector('#departmentStat').textContent = departments.size;
  document.querySelector('#roomStat').textContent = rooms.size;
  document.querySelector('#capacityStat').textContent = average;
}

function fillSelect(id, values, label) {
  const select = document.getElementById(id);
  const previous = select.value;
  select.innerHTML = `<option value="">${label}</option>` + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
  if (values.includes(previous)) select.value = previous;
}

function renderRecords(records) {
  document.querySelector('#resultCount').innerHTML = `<strong>${records.length}</strong> ${records.length === 1 ? 'allocation' : 'allocations'} found`;
  emptyState.hidden = records.length > 0;
  document.querySelector('.table-scroll').hidden = records.length === 0;
  rows.innerHTML = records.map((item) => `
    <tr>
      <td><span class="id-badge">${escapeHtml(item.allocationId)}</span></td>
      <td><div class="course-title">${escapeHtml(item.courseName)}</div><div class="secondary-text">${escapeHtml(item.courseCode)}</div></td>
      <td><div class="department-cell"><span class="dept-dot ${colorForDepartment(item.department)}"></span>${escapeHtml(item.department)}</div></td>
      <td><div class="room-cell">${escapeHtml(item.roomNumber)}</div><div class="building-label">${escapeHtml(item.building)}</div></td>
      <td><div class="day-cell">${escapeHtml(item.day)}</div><div class="secondary-text">${escapeHtml(item.startTime)} – ${escapeHtml(item.endTime)}</div></td>
      <td><span class="capacity-pill">${escapeHtml(item.capacity)} seats</span></td>
      <td><div class="actions"><button class="icon-button" data-action="edit" data-id="${escapeHtml(item.allocationId)}" title="Edit allocation" aria-label="Edit ${escapeHtml(item.allocationId)}">✎</button><button class="icon-button delete" data-action="delete" data-id="${escapeHtml(item.allocationId)}" title="Delete allocation" aria-label="Delete ${escapeHtml(item.allocationId)}">⌫</button></div></td>
    </tr>`).join('');
}

async function loadAllocations() {
  document.querySelector('#resultCount').textContent = 'Loading allocations…';
  try {
    const data = await request(`${API}?${filtersToQuery()}`);
    renderRecords(data.records);
    // Summary cards and filter choices describe the full collection, even while viewing filtered results.
    if (filterIds.some((id) => document.getElementById(id).value && id !== 'sortBy')) {
      const complete = await request(`${API}?sortBy=allocationId`);
      allRecords = complete.records;
    } else allRecords = data.records;
    updateSummary(allRecords);
    fillSelect('departmentFilter', [...new Set(allRecords.map((item) => item.department))].sort(), 'All departments');
    fillSelect('buildingFilter', [...new Set(allRecords.map((item) => item.building))].sort(), 'All buildings');
  } catch (error) {
    document.querySelector('#resultCount').textContent = error.message;
    rows.innerHTML = '';
    emptyState.hidden = false;
    document.querySelector('.table-scroll').hidden = true;
    emptyState.querySelector('h3').textContent = 'Could not load allocations';
    emptyState.querySelector('p').textContent = 'Make sure MongoDB is running, then refresh this page.';
  }
}

function openForm(record = null) {
  editingId = record ? record.allocationId : null;
  form.reset();
  formError.textContent = '';
  document.querySelector('#dialogTitle').textContent = editingId ? 'Edit allocation' : 'Add allocation';
  document.querySelector('#formEyebrow').textContent = editingId ? 'UPDATE SCHEDULE ENTRY' : 'NEW SCHEDULE ENTRY';
  document.querySelector('#saveButton').innerHTML = editingId ? 'Save changes <span>→</span>' : 'Save allocation <span>→</span>';
  for (const [key, value] of Object.entries(record || {})) {
    if (form.elements[key]) form.elements[key].value = value;
  }
  form.elements.allocationId.readOnly = Boolean(editingId);
  dialog.showModal();
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelector('#addButton').addEventListener('click', () => openForm());
document.querySelector('#emptyAddButton').addEventListener('click', () => openForm());
document.querySelector('#closeDialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancelDialog').addEventListener('click', () => dialog.close());
document.querySelector('#sortDirection').addEventListener('click', (event) => {
  descending = !descending;
  event.currentTarget.textContent = descending ? '↓ Desc' : '↑ Asc';
  loadAllocations();
});

let searchTimer;
for (const id of filterIds) {
  const element = document.getElementById(id);
  element.addEventListener(id === 'searchInput' || id === 'roomFilter' || id === 'capacityMin' || id === 'capacityMax' ? 'input' : 'change', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadAllocations, id === 'searchInput' ? 250 : 0);
  });
}

document.querySelector('#clearFilters').addEventListener('click', () => {
  for (const id of filterIds) document.getElementById(id).value = '';
  loadAllocations();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.textContent = '';
  const item = Object.fromEntries(new FormData(form).entries());
  item.capacity = Number(item.capacity);
  if (item.startTime >= item.endTime) {
    formError.textContent = 'End time must be later than start time.';
    return;
  }
  const save = document.querySelector('#saveButton');
  save.disabled = true;
  try {
    await request(editingId ? `${API}/${encodeURIComponent(editingId)}` : API, {
      method: editingId ? 'PUT' : 'POST', body: JSON.stringify(item)
    });
    dialog.close();
    showToast(editingId ? 'Allocation updated successfully.' : 'Allocation added successfully.');
    await loadAllocations();
  } catch (error) { formError.textContent = error.message; }
  finally { save.disabled = false; }
});

rows.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.dataset.id;
  try {
    if (button.dataset.action === 'edit') {
      const record = await request(`${API}/${encodeURIComponent(id)}`);
      openForm(record);
    } else if (confirm(`Delete allocation ${id}? This action cannot be undone.`)) {
      await request(`${API}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      showToast('Allocation deleted.');
      await loadAllocations();
    }
  } catch (error) { showToast(error.message); }
});

loadAllocations();
