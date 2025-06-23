export function getLocalTimeForTimezoneOffset(timezoneOffsetInSeconds) {
  const utc = new Date();
  const utcHours = utc.getUTCHours();
  const utcMinutes = utc.getUTCMinutes();

  const totalMinutes =
    utcHours * 60 + utcMinutes + timezoneOffsetInSeconds / 60;
  const hours = Math.floor((totalMinutes / 60) % 24);
  const minutes = Math.floor(totalMinutes % 60);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}`;
}
