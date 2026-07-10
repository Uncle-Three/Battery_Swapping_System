export const isValidEmail = (email: string): boolean => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email);
};

export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

export const isValidLicensePlate = (plate: string): boolean => {
  // Simple validation for Vietnamese license plate e.g. 29A-12345 or 59-S2 12345
  const re = /^[0-9]{2}[A-Z0-9]-[0-9]{4,5}$|^[0-9]{2}-[A-Z][0-9]\s[0-9]{4,5}$/i;
  return re.test(plate.trim());
};

export const isValidRfid = (rfid: string): boolean => {
  return rfid.trim().length >= 4;
};
