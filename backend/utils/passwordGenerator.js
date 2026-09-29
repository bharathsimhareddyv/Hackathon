/**
 * Generates unique readable temporary passwords for participants.
 * Format examples: Ar@26K7p, Tr#81Lm2, Ax@92Qw8
 */
function generateRandomPassword() {
  const prefixes = ['Ar', 'Tr', 'Ax', 'Nx', 'Px', 'Vx', 'Kx', 'Fx', 'Zx', 'Mx'];
  const symbols = ['@', '#', '$', '!', '%', '&'];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
  const num1 = Math.floor(Math.random() * 90 + 10); // 2 digits
  const char1 = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Uppercase
  const num2 = Math.floor(Math.random() * 9 + 1); // 1 digit
  const char2 = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // Lowercase

  return `${randomPrefix}${randomSymbol}${num1}${char1}${num2}${char2}`;
}

module.exports = { generateRandomPassword };
