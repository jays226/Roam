// Reserved fictional NANP range used only for pending trip placeholders.
const PLACEHOLDER_PHONE_PREFIX='+1555010';

export function isPlaceholderPhone(phone:string){
  return phone.startsWith(PLACEHOLDER_PHONE_PREFIX);
}
