/**
 * Utility functions for payslip file validation
 */

export type ValidationResult = {
  isValid: boolean;
  message: string;
};

/**
 * Validates if the payslip file matches the employee's worker number
 * @param filename The payslip filename
 * @param workerNumber The employee's worker number from the data
 * @returns Object with validation result and message
 */
export const validatePayslipMatch = (
  filename: string, 
  workerNumber: string | number
): ValidationResult => {
  // Standardize worker number for comparison
  const standardizedWorkerNumber = String(workerNumber).trim();
  
  console.log(`From payslipFileValidation.ts: filename: ${filename}, workerNumber: ${standardizedWorkerNumber}`);

  // If the filename contains the worker number directly, that's a match
  if (filename.includes(standardizedWorkerNumber)) {
    return { 
      isValid: true, 
      message: 'Worker number matches.' 
    };
  }
  
  return { 
    isValid: false, 
    message: `Possible mismatch: File doesn't appear to contain worker number "${standardizedWorkerNumber}". Please verify manually.` 
  };
};

export default {
  validatePayslipMatch
};