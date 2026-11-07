const MAX_NAME_LENGTH = 60;

// The backend stores first and last name. The screen asks for one full name.
export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [first = '', ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: first.slice(0, MAX_NAME_LENGTH),
    lastName: rest.join(' ').slice(0, MAX_NAME_LENGTH),
  };
}
