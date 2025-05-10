/**
 * Unit tests for the field extractor utility
 */

import { extractFieldPaths, formatFieldPath, getValueByPath, extractFields } from '../field-extractor';

describe('Field Extractor', () => {
  describe('extractFieldPaths', () => {
    it('should extract paths from a simple object', () => {
      const obj = {
        name: 'John',
        age: 30,
        email: 'john@example.com'
      };

      const paths = extractFieldPaths(obj);
      expect(paths).toEqual(['age', 'email', 'name']);
    });

    it('should extract paths from a nested object', () => {
      const obj = {
        name: 'John',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zip: '12345'
        }
      };

      const paths = extractFieldPaths(obj);
      expect(paths).toContain('address.city');
      expect(paths).toContain('address.street');
      expect(paths).toContain('address.zip');
    });

    it('should extract paths from an array', () => {
      const obj = {
        name: 'John',
        hobbies: ['reading', 'swimming', 'coding']
      };

      const paths = extractFieldPaths(obj);
      expect(paths).toContain('hobbies');
    });

    it('should extract paths from an array of objects', () => {
      const obj = {
        name: 'John',
        contacts: [
          { type: 'email', value: 'john@example.com' },
          { type: 'phone', value: '555-1234' }
        ]
      };

      const paths = extractFieldPaths(obj);
      expect(paths).toContain('contacts');
      expect(paths).toContain('contacts[0].type');
      expect(paths).toContain('contacts[0].value');
    });

    it('should handle null and undefined values', () => {
      const obj = {
        name: 'John',
        address: null,
        phone: undefined
      };

      const paths = extractFieldPaths(obj);
      expect(paths).toContain('address');
      expect(paths).toContain('phone');
    });

    it('should handle circular references', () => {
      const obj = {
        name: 'John'
      };
      obj.self = obj;

      const paths = extractFieldPaths(obj);
      expect(paths).toContain('name');
      expect(paths).toContain('self');
    });

    it('should handle empty objects and arrays', () => {
      const obj = {
        emptyObj: {},
        emptyArr: []
      };

      const paths = extractFieldPaths(obj);
      expect(paths).toContain('emptyObj');
      expect(paths).toContain('emptyArr');
    });
  });

  describe('formatFieldPath', () => {
    it('should format array notation', () => {
      expect(formatFieldPath('items[0].name')).toBe('items[0].name');
      expect(formatFieldPath('data[0][0]')).toBe('data[0][0]');
    });

    it('should handle empty paths', () => {
      expect(formatFieldPath('')).toBe('');
      expect(formatFieldPath(null)).toBe('');
      expect(formatFieldPath(undefined)).toBe('');
    });
  });

  describe('getValueByPath', () => {
    it('should get a value from a simple path', () => {
      const obj = {
        name: 'John',
        age: 30
      };

      expect(getValueByPath(obj, 'name')).toBe('John');
      expect(getValueByPath(obj, 'age')).toBe(30);
    });

    it('should get a value from a nested path', () => {
      const obj = {
        user: {
          name: 'John',
          address: {
            city: 'Anytown'
          }
        }
      };

      expect(getValueByPath(obj, 'user.name')).toBe('John');
      expect(getValueByPath(obj, 'user.address.city')).toBe('Anytown');
    });

    it('should get a value from an array path', () => {
      const obj = {
        users: [
          { name: 'John' },
          { name: 'Jane' }
        ]
      };

      expect(getValueByPath(obj, 'users[0].name')).toBe('John');
      expect(getValueByPath(obj, 'users[1].name')).toBe('Jane');
    });

    it('should return undefined for invalid paths', () => {
      const obj = {
        name: 'John'
      };

      expect(getValueByPath(obj, 'age')).toBeUndefined();
      expect(getValueByPath(obj, 'address.city')).toBeUndefined();
      expect(getValueByPath(obj, 'users[0].name')).toBeUndefined();
    });

    it('should handle null and undefined objects', () => {
      expect(getValueByPath(null, 'name')).toBeUndefined();
      expect(getValueByPath(undefined, 'name')).toBeUndefined();
    });

    it('should handle null and undefined paths', () => {
      const obj = {
        name: 'John'
      };

      expect(getValueByPath(obj, null)).toBeUndefined();
      expect(getValueByPath(obj, undefined)).toBeUndefined();
      expect(getValueByPath(obj, '')).toBeUndefined();
    });
  });

  describe('extractFields', () => {
    it('should extract specified fields from an object', () => {
      const obj = {
        name: 'John',
        age: 30,
        email: 'john@example.com',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zip: '12345'
        }
      };

      const fields = ['name', 'address.city'];
      const result = extractFields(obj, fields);

      expect(result).toEqual({
        name: 'John',
        address: {
          city: 'Anytown'
        }
      });
    });

    it('should extract array fields', () => {
      const obj = {
        name: 'John',
        hobbies: ['reading', 'swimming', 'coding'],
        contacts: [
          { type: 'email', value: 'john@example.com' },
          { type: 'phone', value: '555-1234' }
        ]
      };

      const fields = ['name', 'contacts[0].value'];
      const result = extractFields(obj, fields);

      expect(result).toEqual({
        name: 'John',
        contacts: [
          { value: 'john@example.com' }
        ]
      });
    });

    it('should handle missing fields', () => {
      const obj = {
        name: 'John'
      };

      const fields = ['name', 'age', 'address.city'];
      const result = extractFields(obj, fields);

      expect(result).toEqual({
        name: 'John'
      });
    });

    it('should handle null and undefined objects', () => {
      expect(extractFields(null, ['name'])).toBeNull();
      expect(extractFields(undefined, ['name'])).toBeUndefined();
    });

    it('should handle null and undefined field lists', () => {
      const obj = {
        name: 'John'
      };

      expect(extractFields(obj, null)).toEqual(obj);
      expect(extractFields(obj, undefined)).toEqual(obj);
    });
  });
});
