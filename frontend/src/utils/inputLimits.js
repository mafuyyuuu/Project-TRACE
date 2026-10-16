/** Approved text-entry limits. Never truncate stored values or existing credentials. */
export const INPUT_LIMITS = Object.freeze({
  name: 255, email: 255, id: 50, phone: 13, program: 150,
  referenceName: 150, shortCode: 20, shortText: 255,
  receiptNumber: 100, notes: 2000, address: 500,
  password: 64, otp: 6, template: 100000,
});

export const NUMBER_LIMITS = Object.freeze({ quantity: 2147483647, money: 99999999.99 });
