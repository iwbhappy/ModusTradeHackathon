import originals from './originals.json';
import type { Rule, User } from '../types';
import { departments } from './catalog';
const authorDepartments: Record<string, string> = {
  'Сотрудник закупок': 'Закупки',
  'Сотрудник проектирования': 'Проектирование',
  'Сотрудник бухгалтерии': 'Бухгалтерия',
  'Менеджер по продажам': 'Продажи',
  'Координатор проекта': 'Проектирование',
  'Руководитель проекта': 'Проектирование',
  'Сотрудник офиса': 'Администрация',
};
const ownerDepartments: Record<string, string> = {
  'Руководитель закупок': 'Закупки',
  'Руководитель направления': 'Продажи',
  'Ответственный за номенклатуру': 'Проектирование',
  'Ответственный за обучение': 'HR',
  'Руководитель бухгалтерии': 'Бухгалтерия',
  'Ответственный за процессы': 'Администрация',
  'IT-специалист': 'IT-разработка',
  'Руководитель подразделения': 'Бухгалтерия',
  'Ответственный за договоры': 'Продажи',
  'Руководитель продаж': 'Продажи',
  'Руководитель проектов': 'Проектирование',
  'Руководитель проектирования': 'Проектирование',
  'Административный руководитель': 'Администрация',
  'HR / внутренние коммуникации': 'HR',
  'Администратор документов': 'Администрация',
};

export function createUsersAndRules() {
  const employees: User[] = Object.keys(authorDepartments).map((name, i) => ({
    id: `employee-${i + 1}`,
    name,
    role: 'Сотрудник',
    department: authorDepartments[name],
    vacation: false,
  }));
  const managers: User[] = Object.keys(ownerDepartments).map((name, i) => ({
    id: `manager-${i + 1}`,
    name,
    role: 'Руководитель',
    department: ownerDepartments[name],
    vacation: false,
  }));
  departments.forEach((department, i) => {
    employees.push({
      id: `specialist-${i}`,
      name: `${department === 'Проектирование' ? 'Инженер-проектировщик' : 'Специалист ' + department.toLowerCase()} 2`,
      role: 'Сотрудник',
      department,
      vacation: false,
    });
    if (!managers.some((u) => u.department === department))
      managers.push({
        id: `head-${i}`,
        name: `Руководитель: ${department}`,
        role: 'Руководитель',
        department,
        vacation: false,
      });
  });
  const users = [
    ...employees,
    ...managers,
    {
      id: 'admin',
      name: 'Администратор системы',
      role: 'Администратор' as const,
      department: 'IT-разработка',
      vacation: false,
    },
  ];
  const categories = [...new Set(originals.map((t) => t.category))];
  const rules: Rule[] = categories.map((category, i) => {
    const original = originals.find((t) => t.category === category)!;
    const primary = managers.find((u) => u.name === original.assignee)!;
    const backup =
      managers.find((u) => u.id !== primary.id && u.department === primary.department) ||
      managers.find((u) => u.name === 'Ответственный за процессы')!;
    return {
      id: `rule-${i}`,
      category,
      department: '',
      primaryId: primary.id,
      backupId: backup.id,
      responseDays: original.priority === 'Высокий' ? 1 : 2,
      resolutionDays: original.priority === 'Высокий' ? 5 : 10,
    };
  });
  return { users, rules };
}
