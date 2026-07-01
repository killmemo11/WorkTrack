const pool = require('../config/database');

async function checkHeadcountCapacity({ department_id, title_id, exclude_employee_id, additional = 1 }) {
  const result = { hasCapacity: true, deptOverLimit: false, titleOverLimit: false, deptAvailable: null, titleAvailable: null };

  if (department_id) {
    const [[dept]] = await pool.query(
      'SELECT max_headcount FROM departments WHERE id = ?',
      [department_id]
    );
    if (dept && dept.max_headcount > 0) {
      const [[{ cnt }]] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM employees
         WHERE department_id = ? AND (is_system IS NULL OR is_system = 0)
         ${exclude_employee_id ? 'AND id != ?' : ''}`,
        exclude_employee_id ? [department_id, exclude_employee_id] : [department_id]
      );
      const available = dept.max_headcount - cnt;
      result.deptAvailable = available;
      if (additional > available) {
        result.hasCapacity = false;
        result.deptOverLimit = true;
      }
    }
  }

  if (title_id) {
    const [[title]] = await pool.query(
      'SELECT max_headcount FROM department_titles WHERE id = ?',
      [title_id]
    );
    if (title && title.max_headcount > 0) {
      const [[{ cnt }]] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM employees
         WHERE title_id = ? AND (is_system IS NULL OR is_system = 0)
         ${exclude_employee_id ? 'AND id != ?' : ''}`,
        exclude_employee_id ? [title_id, exclude_employee_id] : [title_id]
      );
      const available = title.max_headcount - cnt;
      result.titleAvailable = available;
      if (additional > available) {
        result.hasCapacity = false;
        result.titleOverLimit = true;
      }
    }
  }

  return result;
}

module.exports = { checkHeadcountCapacity };
