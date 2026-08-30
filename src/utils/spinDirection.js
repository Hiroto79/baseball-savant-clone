/**
 * Converts Statcast spin_axis (degrees: 0 - 360) into standard Baseball Clock Tilt / Spin Direction (e.g. "1:30", "11:15")
 *
 * Formula matching python user spec:
 *   angle = (spin_axis + 180) % 360
 *   hour = int((angle / 30) % 12) -> if 0 then 12
 *   minute = int(((angle % 30) / 30) * 60)
 */
export function getSpinDirection(spinAxis) {
    if (spinAxis == null || isNaN(spinAxis)) return null;

    let angle = (Number(spinAxis) + 180) % 360;
    if (angle < 0) angle += 360;

    let hour = Math.floor((angle / 30) % 12);
    if (hour === 0) hour = 12;

    let minute = Math.round(((angle % 30) / 30) * 60);
    if (minute === 60) {
        minute = 0;
        hour = hour === 12 ? 1 : hour + 1;
    }

    const minuteStr = String(minute).padStart(2, '0');
    return `${hour}:${minuteStr}`;
}

/**
 * Returns the mode (most frequent value) of an array of spin direction strings
 */
export function getModeSpinDirection(spinDirections) {
    if (!spinDirections || spinDirections.length === 0) return '-';

    const freqMap = {};
    let maxFreq = 0;
    let modeVal = '-';

    spinDirections.forEach(dir => {
        if (!dir) return;
        freqMap[dir] = (freqMap[dir] || 0) + 1;
        if (freqMap[dir] > maxFreq) {
            maxFreq = freqMap[dir];
            modeVal = dir;
        }
    });

    return modeVal;
}
