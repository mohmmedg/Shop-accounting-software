/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Product,
  Customer,
  Supplier,
  Employee,
  Expense,
  Discount,
  Settings,
  Invoice,
  Sale,
  Attendance,
  CashRegister,
  InventoryMovement,
  InventoryCheck,
  Return
} from '../types';
import {
  initialSettings,
  initialProducts,
  initialCustomers,
  initialSuppliers,
  initialEmployees,
  initialInvoices,
  initialSales,
  initialExpenses,
  initialDiscounts,
  initialAttendance,
  initialCashRegisters,
  initialMovements
} from '../data/mockData';

interface AppContextType {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  invoices: Invoice[];
  sales: Sale[];
  expenses: Expense[];
  discounts: Discount[];
  attendance: Attendance[];
  cashRegisters: CashRegister[];
  movements: InventoryMovement[];
  settings: Settings;
  currentView: string;
  setView: (view: string) => void;
  currentUser: Employee;
  setCurrentUser: (emp: Employee) => void;
  
  // Business logic mutations
  addInvoice: (invoice: Omit<Invoice, 'id' | 'invoice_number'>) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'total_purchases_usd' | 'loyalty_points' | 'loyalty_tier'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  addEmployee: (employee: Omit<Employee, 'id' | 'total_sales_usd'>) => void;
  updateEmployee: (employee: Employee) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addReturn: (ret: Omit<Return, 'id' | 'return_date'>) => void;
  addDiscount: (discount: Omit<Discount, 'id' | 'usages'>) => void;
  toggleDiscount: (id: string) => void;
  addAttendance: (att: Omit<Attendance, 'id' | 'date'>) => void;
  openShift: (openingUsd: number, openingSyp: number) => void;
  closeShift: (shiftId: string, actualUsd: number, actualSyp: number) => void;
  addInventoryCheck: (check: Omit<InventoryCheck, 'id' | 'date'>) => void;
  recordDebtPayment: (invoiceId: string, amountPaidUsd: number) => void;
  updateSettings: (settings: Settings) => void;
  editSale: (saleId: string, newQty: number, newPriceUsd: number) => void;
  deleteSale: (saleId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setView] = useState<string>('dashboard');
  
  // Load from localStorage or use defaults
  const [settings, setSettingsState] = useState<Settings>(() => {
    const saved = localStorage.getItem('store_settings');
    return saved ? JSON.parse(saved) : initialSettings;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('store_products');
    return saved ? JSON.parse(saved) : initialProducts;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('store_customers');
    return saved ? JSON.parse(saved) : initialCustomers;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('store_suppliers');
    return saved ? JSON.parse(saved) : initialSuppliers;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('store_employees');
    return saved ? JSON.parse(saved) : initialEmployees;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('store_invoices');
    return saved ? JSON.parse(saved) : initialInvoices;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('store_sales');
    return saved ? JSON.parse(saved) : initialSales;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('store_expenses');
    return saved ? JSON.parse(saved) : initialExpenses;
  });

  const [discounts, setDiscounts] = useState<Discount[]>(() => {
    const saved = localStorage.getItem('store_discounts');
    return saved ? JSON.parse(saved) : initialDiscounts;
  });

  const [attendance, setAttendance] = useState<Attendance[]>(() => {
    const saved = localStorage.getItem('store_attendance');
    return saved ? JSON.parse(saved) : initialAttendance;
  });

  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>(() => {
    const saved = localStorage.getItem('store_cash_registers');
    return saved ? JSON.parse(saved) : initialCashRegisters;
  });

  const [movements, setMovements] = useState<InventoryMovement[]>(() => {
    const saved = localStorage.getItem('store_movements');
    return saved ? JSON.parse(saved) : initialMovements;
  });

  // Current logged in user (default to cashiers or admins)
  const [currentUser, setCurrentUser] = useState<Employee>(() => {
    return employees.find(e => e.position === 'admin' || e.is_active) || employees[0];
  });

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('store_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('store_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('store_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('store_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('store_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('store_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem('store_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('store_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('store_discounts', JSON.stringify(discounts));
  }, [discounts]);

  useEffect(() => {
    localStorage.setItem('store_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('store_cash_registers', JSON.stringify(cashRegisters));
  }, [cashRegisters]);

  useEffect(() => {
    localStorage.setItem('store_movements', JSON.stringify(movements));
  }, [movements]);

  // Settings update
  const updateSettings = (newSettings: Settings) => {
    setSettingsState(newSettings);
    // Also batch update SYP prices of all products based on the new rate
    setProducts(prev =>
      prev.map(p => ({
        ...p,
        price_syp: Math.round(p.price_usd * newSettings.usd_to_syp_rate)
      }))
    );
  };

  // 1. ADD INVOICE & PROCESS TRANSACTION
  const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'invoice_number'>) => {
    const invId = `inv-${Date.now()}`;
    const dateStr = new Date().toISOString();
    const invNum = `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      ...invoiceData,
      id: invId,
      invoice_number: invNum,
      sale_date: dateStr
    };

    // a. Record individual sales and update product stocks
    const newSalesRecords: Sale[] = [];
    const newMovements: InventoryMovement[] = [];

    const updatedProducts = products.map(p => {
      const soldItem = invoiceData.items.find(i => i.product_id === p.id);
      if (soldItem) {
        const qtyBefore = p.quantity;
        const qtyAfter = Math.max(0, p.quantity - soldItem.quantity);
        
        // Add sale record
        newSalesRecords.push({
          id: `sale-${Date.now()}-${p.id}`,
          invoice_id: invId,
          product_id: p.id,
          product_name: p.name,
          customer_id: invoiceData.customer_id,
          customer_name: invoiceData.customer_name,
          quantity: soldItem.quantity,
          price_per_unit_usd: soldItem.price_usd,
          total_usd: soldItem.quantity * soldItem.price_usd,
          profit_usd: (soldItem.price_usd - p.cost_usd) * soldItem.quantity,
          sale_date: dateStr
        });

        // Add inventory movement
        newMovements.push({
          id: `mov-${Date.now()}-${p.id}`,
          product_id: p.id,
          product_name: p.name,
          movement_type: 'out',
          quantity_before: qtyBefore,
          quantity_after: qtyAfter,
          change_amount: -soldItem.quantity,
          reference_id: invNum,
          date: dateStr
        });

        return { ...p, quantity: qtyAfter };
      }
      return p;
    });

    // b. Update Employee total sales & commissions
    setEmployees(prev =>
      prev.map(emp => {
        if (emp.id === currentUser.id) {
          return {
            ...emp,
            total_sales_usd: emp.total_sales_usd + invoiceData.total_usd
          };
        }
        return emp;
      })
    );

    // c. Update Customer Total Purchases and Loyalty Points
    if (invoiceData.customer_id) {
      setCustomers(prev =>
        prev.map(cust => {
          if (cust.id === invoiceData.customer_id) {
            const newTotal = cust.total_purchases_usd + invoiceData.total_usd;
            const extraPoints = Math.floor(invoiceData.total_usd * 10); // 10 points per 1 USD
            const newPoints = cust.loyalty_points + extraPoints;
            let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
            if (newPoints >= 1000) tier = 'platinum';
            else if (newPoints >= 500) tier = 'gold';
            else if (newPoints >= 200) tier = 'silver';

            return {
              ...cust,
              total_purchases_usd: newTotal,
              loyalty_points: newPoints,
              loyalty_tier: tier
            };
          }
          return cust;
        })
      );
    }

    // d. Update Active Cash Register Shift balance if open
    setCashRegisters(prev =>
      prev.map(shift => {
        if (shift.status === 'open') {
          // If cash, add whole amount. If debt, nothing. If partial, add the paid amount.
          const addedUsd = invoiceData.paid_usd;
          const addedSyp = invoiceData.paid_syp;
          return {
            ...shift,
            closing_balance_usd: (shift.closing_balance_usd || shift.opening_balance_usd) + addedUsd,
            closing_balance_syp: (shift.closing_balance_syp || shift.opening_balance_syp) + addedSyp
          };
        }
        return shift;
      })
    );

    // Update state lists
    setProducts(updatedProducts);
    setInvoices(prev => [newInvoice, ...prev]);
    setSales(prev => [...newSalesRecords, ...prev]);
    setMovements(prev => [...newMovements, ...prev]);
  };

  // 2. PRODUCT CRUD & ADJUSTMENTS
  const addProduct = (pData: Omit<Product, 'id'>) => {
    const id = `prod-${Date.now()}`;
    const newProduct: Product = {
      ...pData,
      id,
      price_syp: pData.price_syp || Math.round(pData.price_usd * settings.usd_to_syp_rate)
    };
    setProducts(prev => [...prev, newProduct]);

    // Log initial stock movement if quantity > 0
    if (pData.quantity > 0) {
      setMovements(prev => [
        {
          id: `mov-${Date.now()}`,
          product_id: id,
          product_name: pData.name,
          movement_type: 'in',
          quantity_before: 0,
          quantity_after: pData.quantity,
          change_amount: pData.quantity,
          reference_id: 'رصيد أول المدة',
          date: new Date().toISOString()
        },
        ...prev
      ]);
    }
  };

  const updateProduct = (p: Product) => {
    // Check if quantity changed to create adjustment movement
    const existing = products.find(x => x.id === p.id);
    if (existing && existing.quantity !== p.quantity) {
      const diff = p.quantity - existing.quantity;
      setMovements(prev => [
        {
          id: `mov-${Date.now()}`,
          product_id: p.id,
          product_name: p.name,
          movement_type: 'adjustment',
          quantity_before: existing.quantity,
          quantity_after: p.quantity,
          change_amount: diff,
          reference_id: 'تعديل مخزون',
          date: new Date().toISOString()
        },
        ...prev
      ]);
    }
    setProducts(prev => prev.map(x => (x.id === p.id ? p : x)));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(x => x.id !== id));
  };

  // 3. CUSTOMERS
  const addCustomer = (cData: Omit<Customer, 'id' | 'total_purchases_usd' | 'loyalty_points' | 'loyalty_tier'>) => {
    const newCustomer: Customer = {
      ...cData,
      id: `cust-${Date.now()}`,
      total_purchases_usd: 0,
      loyalty_points: 0,
      loyalty_tier: 'bronze'
    };
    setCustomers(prev => [...prev, newCustomer]);
  };

  const updateCustomer = (c: Customer) => {
    setCustomers(prev => prev.map(x => (x.id === c.id ? c : x)));
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(x => x.id !== id));
  };

  // 4. SUPPLIERS
  const addSupplier = (sData: Omit<Supplier, 'id'>) => {
    const newSupplier: Supplier = {
      ...sData,
      id: `supp-${Date.now()}`
    };
    setSuppliers(prev => [...prev, newSupplier]);
  };

  const updateSupplier = (s: Supplier) => {
    setSuppliers(prev => prev.map(x => (x.id === s.id ? s : x)));
  };

  // 5. EMPLOYEES
  const addEmployee = (eData: Omit<Employee, 'id' | 'total_sales_usd'>) => {
    const newEmployee: Employee = {
      ...eData,
      id: `emp-${Date.now()}`,
      total_sales_usd: 0
    };
    setEmployees(prev => [...prev, newEmployee]);
  };

  const updateEmployee = (e: Employee) => {
    setEmployees(prev => prev.map(x => (x.id === e.id ? e : x)));
  };

  // 6. EXPENSES
  const addExpense = (eData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...eData,
      id: `exp-${Date.now()}`
    };
    setExpenses(prev => [newExpense, ...prev]);

    // Deduct from shift cash if open
    setCashRegisters(prev =>
      prev.map(shift => {
        if (shift.status === 'open') {
          return {
            ...shift,
            closing_balance_usd: (shift.closing_balance_usd || shift.opening_balance_usd) - eData.amount_usd,
            closing_balance_syp: (shift.closing_balance_syp || shift.opening_balance_syp) - eData.amount_syp
          };
        }
        return shift;
      })
    );
  };

  // 7. RETURNS
  const addReturn = (returnData: Omit<Return, 'id' | 'return_date'>) => {
    const returnId = `ret-${Date.now()}`;
    const dateStr = new Date().toISOString();
    
    const newReturn: Return = {
      ...returnData,
      id: returnId,
      return_date: dateStr
    };

    // Restock returned product quantity
    setProducts(prev =>
      prev.map(p => {
        if (p.id === returnData.product_id) {
          const qtyBefore = p.quantity;
          const qtyAfter = p.quantity + returnData.quantity;

          // Record movement
          setMovements(m => [
            {
              id: `mov-${Date.now()}-${p.id}`,
              product_id: p.id,
              product_name: p.name,
              movement_type: 'return',
              quantity_before: qtyBefore,
              quantity_after: qtyAfter,
              change_amount: returnData.quantity,
              reference_id: `RET-${returnId.slice(-4).toUpperCase()}`,
              date: dateStr
            },
            ...m
          ]);

          return { ...p, quantity: qtyAfter };
        }
        return p;
      })
    );

    // Adjust customer purchases and points
    if (returnData.customer_id) {
      setCustomers(prev =>
        prev.map(cust => {
          if (cust.id === returnData.customer_id) {
            const newTotal = Math.max(0, cust.total_purchases_usd - returnData.refund_amount_usd);
            const deductedPoints = Math.floor(returnData.refund_amount_usd * 10);
            const newPoints = Math.max(0, cust.loyalty_points - deductedPoints);
            return {
              ...cust,
              total_purchases_usd: newTotal,
              loyalty_points: newPoints
            };
          }
          return cust;
        })
      );
    }

    // Deduct refunded amount from cash register if open
    if (returnData.action_taken === 'refund') {
      setCashRegisters(prev =>
        prev.map(shift => {
          if (shift.status === 'open') {
            return {
              ...shift,
              closing_balance_usd: (shift.closing_balance_usd || shift.opening_balance_usd) - returnData.refund_amount_usd,
              closing_balance_syp: (shift.closing_balance_syp || shift.opening_balance_syp) - returnData.refund_amount_syp
            };
          }
          return shift;
        })
      );
    }

    // Insert return record
    // Store return
    localStorage.setItem('store_returns', JSON.stringify([newReturn, ...JSON.parse(localStorage.getItem('store_returns') || '[]')]));
  };

  // 8. DISCOUNTS
  const addDiscount = (discData: Omit<Discount, 'id' | 'usages'>) => {
    const newDiscount: Discount = {
      ...discData,
      id: `disc-${Date.now()}`,
      usages: 0
    };
    setDiscounts(prev => [newDiscount, ...prev]);
  };

  const toggleDiscount = (id: string) => {
    setDiscounts(prev =>
      prev.map(d => (d.id === id ? { ...d, is_active: !d.is_active } : d))
    );
  };

  // 9. ATTENDANCE
  const addAttendance = (attData: Omit<Attendance, 'id' | 'date'>) => {
    const dateStr = new Date().toISOString().split('T')[0];
    const newAtt: Attendance = {
      ...attData,
      id: `att-${Date.now()}`,
      date: dateStr
    };
    setAttendance(prev => [newAtt, ...prev]);
  };

  // 10. CASH REGISTER (SHIFTS)
  const openShift = (openingUsd: number, openingSyp: number) => {
    const newShift: CashRegister = {
      id: `shift-${Date.now()}`,
      employee_id: currentUser.id,
      employee_name: currentUser.name,
      opening_balance_usd: openingUsd,
      opening_balance_syp: openingSyp,
      closing_balance_usd: openingUsd,
      closing_balance_syp: openingSyp,
      actual_closing_usd: null,
      actual_closing_syp: null,
      status: 'open',
      open_date: new Date().toISOString(),
      close_date: null
    };
    setCashRegisters(prev => [newShift, ...prev]);
  };

  const closeShift = (shiftId: string, actualUsd: number, actualSyp: number) => {
    setCashRegisters(prev =>
      prev.map(shift => {
        if (shift.id === shiftId) {
          return {
            ...shift,
            status: 'closed',
            actual_closing_usd: actualUsd,
            actual_closing_syp: actualSyp,
            close_date: new Date().toISOString()
          };
        }
        return shift;
      })
    );
  };

  // 11. INVENTORY AUDIT CHECK
  const addInventoryCheck = (checkData: Omit<InventoryCheck, 'id' | 'date'>) => {
    const checkId = `check-${Date.now()}`;
    const dateStr = new Date().toISOString();
    
    const newCheck: InventoryCheck = {
      ...checkData,
      id: checkId,
      date: dateStr
    };

    // Update product quantity to match actual audited quantity
    setProducts(prev =>
      prev.map(p => {
        if (p.id === checkData.product_id) {
          if (checkData.difference !== 0) {
            // Log stock movement
            setMovements(m => [
              {
                id: `mov-${Date.now()}-${p.id}`,
                product_id: p.id,
                product_name: p.name,
                movement_type: 'adjustment',
                quantity_before: checkData.expected_quantity,
                quantity_after: checkData.actual_quantity,
                change_amount: checkData.difference,
                reference_id: `AUDIT-${checkId.slice(-4).toUpperCase()}`,
                date: dateStr
              },
              ...m
            ]);
          }
          return { ...p, quantity: checkData.actual_quantity };
        }
        return p;
      })
    );

    // Save checks to state (or localStorage via static list)
    const existing = JSON.parse(localStorage.getItem('store_inventory_checks') || '[]');
    localStorage.setItem('store_inventory_checks', JSON.stringify([newCheck, ...existing]));
  };

  // 12. PAY DEBT
  const recordDebtPayment = (invoiceId: string, amountPaidUsd: number) => {
    const amountPaidSyp = Math.round(amountPaidUsd * settings.usd_to_syp_rate);

    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id === invoiceId) {
          const newRemainingUsd = Math.max(0, inv.remaining_debt_usd - amountPaidUsd);
          const newRemainingSyp = Math.max(0, inv.remaining_debt_syp - amountPaidSyp);
          const newPaidUsd = inv.paid_usd + amountPaidUsd;
          const newPaidSyp = inv.paid_syp + amountPaidSyp;
          const method = newRemainingUsd === 0 ? 'cash' : 'partial';

          // Record cash register income
          setCashRegisters(shiftPrev =>
            shiftPrev.map(shift => {
              if (shift.status === 'open') {
                return {
                  ...shift,
                  closing_balance_usd: (shift.closing_balance_usd || shift.opening_balance_usd) + amountPaidUsd,
                  closing_balance_syp: (shift.closing_balance_syp || shift.opening_balance_syp) + amountPaidSyp
                };
              }
              return shift;
            })
          );

          // Save Debt Payments list to helper storage
          const payId = `pay-${Date.now()}`;
          const newPayObj = {
            id: payId,
            invoice_id: invoiceId,
            customer_name: inv.customer_name,
            payment_method: 'cash',
            amount_usd: amountPaidUsd,
            amount_syp: amountPaidSyp,
            status: 'paid',
            due_date: new Date().toISOString()
          };
          const existingPayments = JSON.parse(localStorage.getItem('store_payments') || '[]');
          localStorage.setItem('store_payments', JSON.stringify([newPayObj, ...existingPayments]));

          return {
            ...inv,
            paid_usd: newPaidUsd,
            paid_syp: newPaidSyp,
            remaining_debt_usd: newRemainingUsd,
            remaining_debt_syp: newRemainingSyp,
            payment_method: method as any
          };
        }
        return inv;
      })
    );
  };

  // 13. EDIT SALE RECORD
  const editSale = (saleId: string, newQty: number, newPriceUsd: number) => {
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;

    const diffQty = newQty - targetSale.quantity;
    const oldTotalUsd = targetSale.total_usd;
    const newTotalUsd = newQty * newPriceUsd;
    const diffTotalUsd = newTotalUsd - oldTotalUsd;

    // Check product cost to update profits
    const prodObj = products.find(p => p.id === targetSale.product_id);
    const costUsd = prodObj ? prodObj.cost_usd : 0.0;
    const newProfitUsd = (newPriceUsd - costUsd) * newQty;

    // Update product quantity in stock
    setProducts(prev =>
      prev.map(p => {
        if (p.id === targetSale.product_id) {
          const qtyAfter = Math.max(0, p.quantity - diffQty);
          // Movement log
          setMovements(m => [
            {
              id: `mov-${Date.now()}`,
              product_id: p.id,
              product_name: p.name,
              movement_type: 'adjustment',
              quantity_before: p.quantity,
              quantity_after: qtyAfter,
              change_amount: -diffQty,
              reference_id: `تعديل مبيعات`,
              date: new Date().toISOString()
            },
            ...m
          ]);
          return { ...p, quantity: qtyAfter };
        }
        return p;
      })
    );

    // Update sales state
    setSales(prev =>
      prev.map(s =>
        s.id === saleId
          ? {
              ...s,
              quantity: newQty,
              price_per_unit_usd: newPriceUsd,
              total_usd: newTotalUsd,
              profit_usd: newProfitUsd
            }
          : s
      )
    );

    // Update parent Invoice totals
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id === targetSale.invoice_id) {
          const updatedItems = inv.items.map(item => {
            if (item.product_id === targetSale.product_id) {
              return {
                ...item,
                quantity: newQty,
                price_usd: newPriceUsd,
                price_syp: Math.round(newPriceUsd * settings.usd_to_syp_rate)
              };
            }
            return item;
          });

          const totalUsd = updatedItems.reduce((acc, i) => acc + i.quantity * i.price_usd, 0);
          const totalSyp = Math.round(totalUsd * settings.usd_to_syp_rate);

          return {
            ...inv,
            items: updatedItems,
            total_usd: totalUsd,
            total_syp: totalSyp,
            paid_usd: inv.payment_method === 'cash' ? totalUsd : inv.paid_usd,
            paid_syp: inv.payment_method === 'cash' ? totalSyp : inv.paid_syp,
            remaining_debt_usd: inv.payment_method === 'debt' ? totalUsd : (inv.payment_method === 'partial' ? Math.max(0, totalUsd - inv.paid_usd) : 0),
            remaining_debt_syp: inv.payment_method === 'debt' ? totalSyp : (inv.payment_method === 'partial' ? Math.max(0, totalSyp - inv.paid_syp) : 0)
          };
        }
        return inv;
      })
    );
  };

  // 14. DELETE SALE RECORD
  const deleteSale = (saleId: string) => {
    const targetSale = sales.find(s => s.id === saleId);
    if (!targetSale) return;

    // Refund product quantity to inventory
    setProducts(prev =>
      prev.map(p => {
        if (p.id === targetSale.product_id) {
          const qtyAfter = p.quantity + targetSale.quantity;
          setMovements(m => [
            {
              id: `mov-${Date.now()}`,
              product_id: p.id,
              product_name: p.name,
              movement_type: 'return',
              quantity_before: p.quantity,
              quantity_after: qtyAfter,
              change_amount: targetSale.quantity,
              reference_id: `حذف مبيع`,
              date: new Date().toISOString()
            },
            ...m
          ]);
          return { ...p, quantity: qtyAfter };
        }
        return p;
      })
    );

    // Delete sale
    setSales(prev => prev.filter(s => s.id !== saleId));

    // Remove or adjust Invoice
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id === targetSale.invoice_id) {
          const updatedItems = inv.items.filter(item => item.product_id !== targetSale.product_id);
          
          if (updatedItems.length === 0) {
            // Invoice is now empty, delete or make null, but we can filter it out later
            return null;
          }

          const totalUsd = updatedItems.reduce((acc, i) => acc + i.quantity * i.price_usd, 0);
          const totalSyp = Math.round(totalUsd * settings.usd_to_syp_rate);

          return {
            ...inv,
            items: updatedItems,
            total_usd: totalUsd,
            total_syp: totalSyp,
            paid_usd: inv.payment_method === 'cash' ? totalUsd : Math.min(inv.paid_usd, totalUsd),
            paid_syp: inv.payment_method === 'cash' ? totalSyp : Math.min(inv.paid_syp, totalSyp),
            remaining_debt_usd: inv.payment_method === 'debt' ? totalUsd : (inv.payment_method === 'partial' ? Math.max(0, totalUsd - inv.paid_usd) : 0),
            remaining_debt_syp: inv.payment_method === 'debt' ? totalSyp : (inv.payment_method === 'partial' ? Math.max(0, totalSyp - inv.paid_syp) : 0)
          };
        }
        return inv;
      }).filter((inv): inv is Invoice => inv !== null)
    );
  };

  return (
    <AppContext.Provider
      value={{
        products,
        customers,
        suppliers,
        employees,
        invoices,
        sales,
        expenses,
        discounts,
        attendance,
        cashRegisters,
        movements,
        settings,
        currentView,
        setView,
        currentUser,
        setCurrentUser,
        addInvoice,
        addProduct,
        updateProduct,
        deleteProduct,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        addEmployee,
        updateEmployee,
        addExpense,
        addReturn,
        addDiscount,
        toggleDiscount,
        addAttendance,
        openShift,
        closeShift,
        addInventoryCheck,
        recordDebtPayment,
        updateSettings,
        editSale,
        deleteSale
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
