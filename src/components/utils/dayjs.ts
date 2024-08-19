import dayjs from "dayjs";
import relativeTimePlugin from "dayjs/plugin/relativeTime";
import deLocale from "dayjs/locale/de";

dayjs.extend(relativeTimePlugin);
dayjs.locale(deLocale);

export default dayjs;
