// Regex kiểm tra các ký tự đặc biệt
export const SYMBOLS_REGEX = /[!@%^*()+=<>?,.:;"&#[\]~$`\-{}|\\]/g;

export function generateRandomString() {
  return Math.random().toString(36).substring(7);
}

export const getRegexPassword = () => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])(?=.{8,})/;
};

export function getRegexUsername() {
  return /^\w{6,16}$/;
}

export function generateCode(str: string, underscore = true) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/[!@%^*()+=<>?,.:;"&#[\]~$_`\-{}|\\/]/g, ' ');
  str = str.replace(/ +/g, ' ');
  str = str.trim().toUpperCase();

  const matches = str.match(/\b(\w)/g);
  if (!matches) return '';
  const acronym = matches.join('');
  return underscore ? `${acronym}_` : acronym;
}

export function getRndInteger(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function validatePhone(phone: string) {
  return (
    ((phone.startsWith('01') ||
      phone.startsWith('028') ||
      phone.startsWith('023') ||
      phone.startsWith('02')) &&
      phone.length === 11) ||
    ((phone.startsWith('03') ||
      phone.startsWith('05') ||
      phone.startsWith('07') ||
      phone.startsWith('08') ||
      phone.startsWith('09')) &&
      phone.length === 10)
  );
}

export function formatPhone(phone: string) {
  return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}

export function getMsgClient(message: string) {
  if (message.indexOf('[!|') !== -1 && message.indexOf('|!]') !== -1) {
    let part1 = message.split('[!|')[0] || '';
    part1 = part1.trim();
    const parts2 = message.split('|!]');

    return part1 + (parts2[1] ?? ''); // fallback an toàn
  }
  return message;
}

export function validateEmail(email: string) {
  return getRegexEmail().test(String(email).toLowerCase());
}

export function getRegexEmail() {
  return /^[\w\-.]+@[\w\-.]+\.[a-zA-Z]{2,5}$/;
}
export const isValidEmail = (email: string) => getRegexEmail().test(email);
export function validateMobile(mobile: string) {
  return getRegexMobile().test(String(mobile));
}

export function getRegexPhoneNumber() {
  return /^(\+84|84|0)(9|3|7|8|5)\d{8}\b/;
}

export function getRegexMobile() {
  return /^\d{8,15}\b/;
}

export const decodeHtml = (textInput: string) => {
  if (!textInput) return '';
  const removeHtml = textInput.replace(/<\/?[^>]+(>|$)/g, '');
  return removeHtml;
};

export const stripHtml = (textInput: string) => {
  if (!textInput) return '';
  return textInput.replace(/<\/?[^>]+(>|$)/g, '');
};

export const convertContent = (text: string) => {
  let content;
  try {
    const parseText = JSON.parse(decodeHtml(text));
    content = [parseText?.ActionName, parseText?.ProcessedContent]
      .join(parseText?.ActionName && parseText?.ProcessedContent ? ': ' : '')
      .concat(
        parseText?.SendReportHandle ? ` ${parseText?.SendReportHandle}` : ''
      );
  } catch (e) {
    content = text;
    console.log('e', e);
  }
  return content;
};

export const fixImplicateText = (text: string) => {
  if (!text) return '';
  return text
    .replace(/↵/g, ' ')
    .replace(/(<div>|<p>)/g, '&nbsp;<span>')
    .replace(/(<\/div>|<\/p>)/g, '</span>')
    .replace(/(<div |<p )/g, '&nbsp;<span ')
    .replace(/<br\s*\/?>/g, ' ');
};

export function getTimeSpent() {
  return /^(d[g|h]?)?(d?[05][mp])?$/;
}

export function formatUserName(
  fullName: string,
  userName: string,
  deptName: string
) {
  if (!userName) return `${fullName} - ${deptName}`;
  if (!deptName) return `${userName} - ${fullName}`;
  return `${fullName} - (${userName}) - ${deptName}`;
}

export function getRegexIdentity() {
  return /^\d{12}$/;
}

export const removeDiacritics = (str: string) => {
  // Chuyển các ký tự thường
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');

  // Chuyển các ký tự in hoa
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');

  // Trả về chuỗi đã xử lý
  return str;
};
export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
