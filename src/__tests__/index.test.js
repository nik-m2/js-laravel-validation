
import { validate } from '../index'
import RULES from '../rules'
import defaultMessages from '../messages'

let MESSAGES = defaultMessages;

const { validateField, validateForm, parseRule, setMessage, setMessages } = validate;

const oldRules = Object.assign({}, RULES);
const oldMessages = Object.assign({}, MESSAGES);

describe('Custom messages', () => {

    it('can override an existing message', () => {
        setMessage('test', () => 'hey!');

        expect(defaultMessages.test).toBeTruthy();
        expect(defaultMessages.test()).toEqual('hey!')
    });

    it('can override existing messages', () => {
        setMessages({
            test: () => 'hey!',
            test2: () => 'hello',
        });

        expect(defaultMessages.test).toBeTruthy();
        expect(defaultMessages.test()).toEqual('hey!');
        expect(defaultMessages.test2).toBeTruthy();
        expect(defaultMessages.test2()).toEqual('hello')
    });

})

describe('Form Validator', () => {

    const mockedRules = [];
    const mockedMessages = [];

    function mockValidateField(returnVal) {
        const mock = jest.fn();
        mock.mockReturnValue(returnVal);
        validate.validateField = mock;
        return mock;
    }

    function mockRule(name, returnVal) {
        const mock = jest.fn();
        mock.mockReturnValue(returnVal);
        RULES[name] = mock;
        mockedRules.push(name);
        return mock;
    }

    function mockMessage(name, returnVal) {
        const mock = jest.fn();
        mock.mockReturnValue(returnVal);
        MESSAGES[name] = mock;
        mockedMessages.push(name);
        return mock;
    }

    function restoreMocks() {
        validate.validateForm = validateForm;
        validate.validateField = validateField;

        mockedRules.forEach(rule => RULES[rule] = oldRules[rule]);
        mockedRules.length = 0;

        mockedMessages.forEach(message => MESSAGES[message] = oldMessages[message]);
        mockedMessages.length = 0;
    }

    describe('validateForm', () => {
        it('can pass field data to validateField', () => {
            const formData = {
                test: {
                    value: 1,
                    validation: 'required',
                }
            }

            const validateField = mockValidateField({});

            validateForm({ formData} );
            expect(validateField).toHaveBeenCalledWith({
                key: 'test',
                value: 1,
                validation: ['required'],
            }, formData)

            restoreMocks();
        });

        it('can return an error', () => {
            const formData = {
                test: {
                    validation: 'required',
                }
            }

            const validateField = mockValidateField({
                errors: ['required']
            });

            expect(validateForm({ formData, includeMessages: false } )).toEqual({
                errors: {
                    test: {
                        errors: [{ rule: 'required' }],
                    }
                }
            });
            expect(validateField).toHaveBeenCalled();

            restoreMocks();
        });

        it('can return an error with a message', () => {
            const formData = {
                test: {
                    value: "testVal",
                    validation: 'testRule',
                    customProp: 1,
                }
            }

            const validateField = mockValidateField({
                errors: ['testRule']
            });

            const messageMock = mockMessage('testRule', 'hello');

            expect(validateForm({ formData, includeMessages: true } )).toEqual({
                errors: {
                    test: {
                        errors: [{
                            rule: 'testRule',
                            message: 'hello',
                        }],
                    }
                }
            })

            expect(validateField).toHaveBeenCalled();
            expect(messageMock).toHaveBeenCalledWith({
                key: 'test',
                validation: ['testRule'],
                value: 'testVal',
                customProp: 1,
            });

            restoreMocks();
        });

        it('can bail on first error', () => {
            const formData = {
                test: {
                    value: null,
                    validation: 'required|bail',
                },
                test2: {
                    value: null,
                    validation: 'required',
                }
            }

            const validateField = mockValidateField();
            validateField.mockReturnValueOnce({
                errors: ['required'],
            });
            validateField.mockReturnValueOnce({
                errors: ['required'],
            });

            expect(validateForm({ formData, includeMessages: false } )).toEqual({
                errors: {
                    test: {
                        errors: [{ rule: 'required' }],
                    },
                }
            })

            restoreMocks();
        });

        it('can bail on first error if bail is on second field', () => {
            const formData = {
                test: {
                    value: null,
                    validation: 'required',
                },
                test2: {
                    value: null,
                    validation: 'required|bail',
                }
            }

            const validateField = mockValidateField();
            validateField.mockReturnValueOnce({
                errors: ['required'],
            });
            validateField.mockReturnValueOnce({
                errors: ['required'],
            });

            expect(validateForm({ formData, includeMessages: false } )).toEqual({
                errors: {
                    test: {
                        errors: [{ rule: 'required' }],
                    }
                }
            })

            restoreMocks();
        });

        it('can bail on first error if bail is on third field', () => {
            const formData = {
                test: {
                    value: null,
                    validation: 'required',
                },
                test2: {
                    value: null,
                    validation: 'required',
                },
                test3: {
                    value: null,
                    validation: 'required|bail',
                }
            }

            const validateField = mockValidateField();
            validateField.mockReturnValueOnce({
                errors: ['required'],
            });
            validateField.mockReturnValueOnce({
                errors: ['required'],
            });
            validateField.mockReturnValueOnce({
                errors: ['required'],
            });

            expect(validateForm({ formData, includeMessages: false } )).toEqual({
                errors: {
                    test: {
                        errors: [{ rule: 'required' }],
                    },
                }
            })

            restoreMocks();
        });

        it('will only give an error for first field error on bail', () => {
            const formData = {
                test: {
                    value: null,
                    validation: 'required|string|bail',
                },
            }

            const validateField = mockValidateField();
            validateField.mockReturnValueOnce({
                errors: ['required', 'string'],
            });

            expect(validateForm({ formData, includeMessages: false } )).toEqual({
                errors: {
                    test: {
                        errors: [{ rule: 'required' }],
                    },
                }
            })

            restoreMocks();
        });
    });

    describe('parseRule', () => {

        it('can parse a rule with no params', () => {
            expect(parseRule('test')).toEqual({
                key: 'test',
                params: [],
            })
        })

        it('can parse a rule with one param', () => {
            expect(parseRule('test:0')).toEqual({
                key: 'test',
                params: ["0"],
            })
        })

        it('can parse a rule with two params', () => {
            expect(parseRule('test:0,1')).toEqual({
                key: 'test',
                params: ["0", "1"],
            })
        })

    })

    describe('validateField', () => {
        function createFieldData({ key="test", value, validation}={}) {
            return { key, value, validation };
        }

        const oldWarn = console.warn;

        beforeEach(() => {
            console.warn = jest.fn();
        })

        afterEach(() => {
            console.warn = oldWarn;
        })

        it('can allow a field with no rules', () => {
            const fieldData = createFieldData({ value: "hey", validation: ['required'] })

            expect(validateField(fieldData)).toEqual({ errors: false });
            expect(console.warn).not.toHaveBeenCalled();
        });

        it('can allow a validated field', () => {
            const fieldData = createFieldData({ value: "hey", validation: ['required'] })

            expect(validateField(fieldData)).toEqual({ errors: false });
            expect(console.warn).not.toHaveBeenCalled();
        });

        it('can allow a field with no rules', () => {
            const fieldData = createFieldData({ value: "hey", validation: ['required']  })

            expect(validateField(fieldData)).toEqual({ errors: false });
            expect(console.warn).not.toHaveBeenCalled();
        });

        it('can allow a nullable field', () => {
            const fieldData = createFieldData({
                value: null,
                validation: ['test', 'nullable'],
            });

            const ruleMock = mockRule('test', false);

            expect(validateField(fieldData)).toEqual({ errors: false });
            expect(console.warn).not.toHaveBeenCalled();

            expect(ruleMock).toHaveBeenCalled();
            restoreMocks();
        })

        it('can detect an invalid field', () => {
            const result = validateField(createFieldData({ validation: ['required'] }))

            expect(result.errors).toEqual(['required']);
            expect(console.warn).not.toHaveBeenCalled();
        });

        it('can detect multiple rules on one field', () => {
            const result = validateField(createFieldData({ validation: ['required', 'string'] }))

            expect(result.errors).toEqual(['required', 'string']);
            expect(console.warn).not.toHaveBeenCalled();
        })

        it('will throw a warning if there is an unknown rule', () => {

            const fieldData = createFieldData({ validation: ['unknown'] })

            expect(validateField(fieldData)).toEqual({ errors: false });
            expect(console.warn).toHaveBeenCalled();

        });

        it('will throw a warning if a nullable field has an unknown rule', () => {

            const fieldData = createFieldData({ validation: ['unknown', 'nullable'] })

            expect(validateField(fieldData)).toEqual({ errors: false });
            expect(console.warn).toHaveBeenCalled();

        });

        it('will throw a warning if there is an error validating rule', () => {

            const fieldData = createFieldData({ validation: ['testRule'] })

            const ruleMock = mockRule('testRule');
            ruleMock.mockImplementation(() => {
                throw new Error();
            });

            expect(validateField(fieldData)).toEqual({ errors: ['testRule'] });
            expect(console.warn).toHaveBeenCalled();
            expect(ruleMock).toHaveBeenCalled();

            restoreMocks();
        });

        it('will throw a warning if there is an error validating rule with a nullable value', () => {

            const fieldData = createFieldData({ validation: ['test', 'nullable'] })

            const ruleMock = mockRule('test');
            ruleMock.mockImplementation(() => {
                throw new Error();
            });

            expect(validateField(fieldData)).toEqual({ errors: ['test'] });
            expect(console.warn).toHaveBeenCalled();
            expect(ruleMock).toHaveBeenCalled();

            restoreMocks();
        });

    })

})