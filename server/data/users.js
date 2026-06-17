// In-memory user store. Replace with a real database in production.
// Passwords are plain-text here — hash with bcrypt before going to production.
const USERS = [
  {
    id: 1,
    username: 'dlamini',
    password: 'pass123',
    name: 'T. Dlamini',
    persal: '20482345',
    dept: 'GPG — Health',
    role: 'official',
  },
  {
    id: 2,
    username: 'khumalo',
    password: 'pass123',
    name: 'N. Khumalo',
    persal: '20481111',
    dept: 'GPG — Finance',
    role: 'supervisor',
  },
  {
    id: 3,
    username: 'sithole',
    password: 'pass123',
    name: 'B. Sithole',
    persal: '20489876',
    dept: 'GPG — HRS Payroll',
    role: 'hrs',
  },
  {
    id: 4,
    username: 'mokoena',
    password: 'pass123',
    name: 'P. Mokoena',
    persal: '20481234',
    dept: 'GPG — ECM Admin',
    role: 'ecm',
  },
  {
    id: 5,
    username: 'nkosi',
    password: 'pass123',
    name: 'L. Nkosi',
    persal: '20483456',
    dept: 'GPG — DMC Payroll',
    role: 'dmc',
  },
  {
    id: 6,
    username: 'admin',
    password: 'admin123',
    name: 'Admin User',
    persal: '',
    dept: 'GPG — System Admin',
    role: 'admin',
  },
];

module.exports = USERS;
