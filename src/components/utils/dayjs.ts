import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import relativeTimePlugin from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import deLocale from "dayjs/locale/de";

dayjs.extend(utc);
dayjs.extend(relativeTimePlugin);
dayjs.extend(timezone);
dayjs.locale(deLocale);

export default dayjs;
