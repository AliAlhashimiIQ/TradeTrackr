import { useState, useCallback } from 'react';

interface ValidationRule<T> {
  validator: (value: unknown, formData?: T) => boolean;
  message: string;
}

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T>[];
};

interface UseFormValidationReturn<T> {
  errors: Record<string, string>;
  validateField: (name: keyof T, value: unknown) => boolean;
  validateForm: () => boolean;
  setFieldError: (name: keyof T, error: string) => void;
  clearErrors: () => void;
  hasErrors: boolean;
}

function useFormValidation<T extends Record<string, any>>(
  formData: T,
  validationRules: ValidationRules<T>
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = useCallback(
    (name: keyof T, value: unknown): boolean => {
      const fieldRules = validationRules[name] || [];
      
      // Clear previous error for this field
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as string];
        return newErrors;
      });

      // Apply validation rules
      for (const rule of fieldRules) {
        if (!rule.validator(value, formData)) {
          setErrors(prev => ({
            ...prev,
            [name as string]: rule.message,
          }));
          return false;
        }
      }
      
      return true;
    },
    [formData, validationRules]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Check each field with validation rules
    Object.entries(validationRules).forEach(([fieldName, rules]) => {
      const fieldValue = formData[fieldName];
      
      if (rules && rules.length > 0) {
        for (const rule of rules) {
          if (!rule.validator(fieldValue, formData)) {
            newErrors[fieldName] = rule.message;
            isValid = false;
            break;
          }
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, validationRules]);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors(prev => ({
      ...prev,
      [name as string]: error,
    }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    setFieldError,
    clearErrors,
    hasErrors: Object.keys(errors).length > 0,
  };
}

// Common validators
export const validators = {
  required: (value: unknown) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return true;
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  },
  minLength: (min: number) => (value: string) => 
    typeof value === 'string' && value.length >= min,
  maxLength: (max: number) => (value: string) => 
    typeof value === 'string' && value.length <= max,
  pattern: (pattern: RegExp) => (value: string) => 
    typeof value === 'string' && pattern.test(value),
  email: (value: string) => 
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value),
  number: (value: unknown) => 
    typeof value === 'number' || (!isNaN(parseFloat(String(value))) && isFinite(Number(value))),
  min: (min: number) => (value: number) => 
    typeof value === 'number' && value >= min,
  max: (max: number) => (value: number) => 
    typeof value === 'number' && value <= max,
  date: (value: string) => 
    !isNaN(Date.parse(value)),
  dateBefore: (maxDate: Date) => (value: string) => 
    new Date(value) <= maxDate,
  dateAfter: (minDate: Date) => (value: string) => 
    new Date(value) >= minDate,
  custom: (fn: (value: unknown) => boolean) => fn,
};

export default useFormValidation; 