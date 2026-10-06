export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  departmentId: string;
  /** ISO `yyyy-MM-dd`, always. Formatting is a display concern. */
  hireDate: string;
}

export type EmployeeInput = Omit<Employee, 'id'>;

/** Grid row: the foreign key resolved to its display value, so sort/filter work on the name. */
export interface EmployeeRow extends Employee {
  departmentName: string;
}

export function toEmployeeRows(
  employees: Employee[],
  departmentNames: Map<string, string>,
): EmployeeRow[] {
  return employees.map((e) => ({
    ...e,
    departmentName: departmentNames.get(e.departmentId) ?? '',
  }));
}
