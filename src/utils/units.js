export const KMH_TO_MPH = 0.621371;
export const MPH_TO_KMH = 1.60934;
export const M_TO_FT = 3.28084;
export const FT_TO_M = 0.3048;
export const CM_TO_IN = 0.393701;
export const IN_TO_CM = 2.54;

/**
 * Convert velocity between km/h and mph
 * @param {number} value - The velocity value
 * @param {string} fromUnit - Source unit ('kmh' or 'mph')
 * @param {string} toUnits - Target unit system ('imperial' or 'metric')
 * @returns {number} Converted value
 */
export const convertVelocity = (value, fromUnit, toUnits) => {
    if (!value || value === null || isNaN(value)) return value;

    // If already in target units, no conversion needed
    if ((fromUnit === 'kmh' && toUnits === 'metric') || (fromUnit === 'mph' && toUnits === 'imperial')) {
        return value;
    }

    if (toUnits === 'imperial') {
        // Convert km/h to mph
        return value * KMH_TO_MPH;
    } else {
        // Convert mph to km/h
        return value * MPH_TO_KMH;
    }
};

/**
 * Convert distance between meters/cm and feet/inches
 * @param {number} value - The distance value
 * @param {string} fromUnit - Source unit ('m', 'ft', 'cm', 'in')
 * @param {string} toUnits - Target unit system ('imperial' or 'metric')
 * @returns {number} Converted value
 */
export const convertDistance = (value, fromUnit, toUnits) => {
    if (!value || value === null || isNaN(value)) return value;

    // Determine if this is large (m/ft) or small (cm/in) distance
    const isLarge = fromUnit === 'm' || fromUnit === 'ft';

    // If already in target units, no conversion needed
    if ((fromUnit === 'm' && toUnits === 'metric') || (fromUnit === 'ft' && toUnits === 'imperial') ||
        (fromUnit === 'cm' && toUnits === 'metric') || (fromUnit === 'in' && toUnits === 'imperial')) {
        return value;
    }

    if (isLarge) {
        // Meters <-> Feet
        if (toUnits === 'imperial') {
            return value * M_TO_FT;
        } else {
            return value * FT_TO_M;
        }
    } else {
        // Centimeters <-> Inches
        if (toUnits === 'imperial') {
            return value * CM_TO_IN;
        } else {
            return value * IN_TO_CM;
        }
    }
};

/**
 * Get the velocity unit label
 * @param {string} units - Unit system ('imperial' or 'metric')
 * @returns {string} Unit label
 */
export const getVelocityUnit = (units) => {
    return units === 'imperial' ? 'mph' : 'km/h';
};

/**
 * Get the distance unit label
 * @param {string} units - Unit system ('imperial' or 'metric')
 * @param {string} type - Type of distance ('large' for m/ft, 'small' for cm/in)
 * @returns {string} Unit label
 */
export const getDistanceUnit = (units, type = 'large') => {
    if (type === 'large') {
        return units === 'imperial' ? 'ft' : 'm';
    } else {
        return units === 'imperial' ? 'in' : 'cm';
    }
};

/**
 * Format a value with unit conversion and display
 * @param {number} value - The value to format
 * @param {string} toUnits - Target unit system
 * @param {string} valueType - Type of value ('velocity', 'distance-large', 'distance-small')
 * @param {string} fromUnits - Source unit system
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted value with unit
 */
export const formatValue = (value, toUnits, valueType, fromUnits = 'metric', decimals = 1) => {
    if (!value || value === null) return '-';

    let converted;
    let unit;

    if (valueType === 'velocity') {
        converted = convertVelocity(value, toUnits, fromUnits);
        unit = getVelocityUnit(toUnits);
    } else if (valueType === 'distance-large') {
        converted = convertDistance(value, toUnits, 'large', fromUnits);
        unit = getDistanceUnit(toUnits, 'large');
    } else if (valueType === 'distance-small') {
        converted = convertDistance(value, toUnits, 'small', fromUnits);
        unit = getDistanceUnit(toUnits, 'small');
    } else {
        return value.toFixed(decimals);
    }

    return `${converted.toFixed(decimals)} ${unit}`;
};
