import { http } from "@/utils/http";
import type { PageData } from "@/utils/table";

export type DeleteResult = {
  ok: boolean;
};

export type CarExpenseCategoryType = "system" | "custom";

export type CarExpenseCategory = {
  id: string;
  categoryId: string;
  name: string;
  seq: number;
  isEnabled: boolean;
  isHidden?: boolean;
  categoryType: CarExpenseCategoryType;
  createdAt: string;
  updatedAt: string;
};

export type GetCarExpenseCategoryListParams = {
  page?: number;
  pageSize?: number;
  nameKeyword?: string;
  isEnabled?: boolean;
  includeHidden?: boolean;
};

export type CarExpenseCategoryListResult = PageData<CarExpenseCategory>;

export type CreateCarExpenseCategoryPayload = {
  name: string;
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateCarExpenseCategoryPayload = {
  categoryId: string;
  name?: string;
  seq?: number;
  isEnabled?: boolean;
};

export const getCarExpenseCategoryList = (
  data: GetCarExpenseCategoryListParams = {}
) => {
  return http.request<CarExpenseCategoryListResult>(
    "post",
    "/car-expense-categories",
    { data }
  );
};

export type GetCarExpenseCategoryListByUserParams =
  GetCarExpenseCategoryListParams & {
    userId: string;
  };

export const getCarExpenseCategoryListByUser = (
  data: GetCarExpenseCategoryListByUserParams
) => {
  return http.request<CarExpenseCategoryListResult>(
    "post",
    "/car-expense-categories/by-user",
    { data }
  );
};

export const createCarExpenseCategory = (
  data: CreateCarExpenseCategoryPayload
) => {
  return http.request<CarExpenseCategory>(
    "post",
    "/car-expense-categories/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCarExpenseCategory = (
  data: UpdateCarExpenseCategoryPayload
) => {
  return http.request<CarExpenseCategory>(
    "post",
    "/car-expense-categories/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCarExpenseCategory = (data: { categoryId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/car-expense-categories/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CarExpenseCategoryTemplate = {
  id: string;
  templateCategoryId: string;
  name: string;
  seq: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GetCarExpenseCategoryTemplateListParams = {
  page?: number;
  pageSize?: number;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type CarExpenseCategoryTemplateListResult =
  PageData<CarExpenseCategoryTemplate>;

export type CreateCarExpenseCategoryTemplatePayload = {
  name: string;
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateCarExpenseCategoryTemplatePayload = {
  templateCategoryId: string;
  name?: string;
  seq?: number;
  isEnabled?: boolean;
};

export const getCarExpenseCategoryTemplateList = (
  data: GetCarExpenseCategoryTemplateListParams = {}
) => {
  return http.request<CarExpenseCategoryTemplateListResult>(
    "post",
    "/car-expense-category-templates",
    { data }
  );
};

export const createCarExpenseCategoryTemplate = (
  data: CreateCarExpenseCategoryTemplatePayload
) => {
  return http.request<CarExpenseCategoryTemplate>(
    "post",
    "/car-expense-category-templates/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCarExpenseCategoryTemplate = (
  data: UpdateCarExpenseCategoryTemplatePayload
) => {
  return http.request<CarExpenseCategoryTemplate>(
    "post",
    "/car-expense-category-templates/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCarExpenseCategoryTemplate = (data: {
  templateCategoryId: string;
}) => {
  return http.request<DeleteResult>(
    "post",
    "/car-expense-category-templates/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CarExpenseRecord = {
  id: string;
  recordId: string;
  date: string;
  categoryId: string;
  amount: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetCarExpenseRecordListParams = {
  page?: number;
  pageSize?: number;
  month?: string;
  categoryId?: string;
  keyword?: string;
};

export type CarExpenseRecordListResult = PageData<CarExpenseRecord>;

export type CreateCarExpenseRecordPayload = {
  date: string;
  categoryId: string;
  amount: number;
  remark?: string | null;
};

export type UpdateCarExpenseRecordPayload = {
  recordId: string;
  date?: string;
  categoryId?: string;
  amount?: number;
  remark?: string | null;
};

export const getCarExpenseRecordList = (
  data: GetCarExpenseRecordListParams = {}
) => {
  return http.request<CarExpenseRecordListResult>(
    "post",
    "/car-expense-records",
    { data }
  );
};

export const createCarExpenseRecord = (data: CreateCarExpenseRecordPayload) => {
  return http.request<CarExpenseRecord>(
    "post",
    "/car-expense-records/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCarExpenseRecord = (data: UpdateCarExpenseRecordPayload) => {
  return http.request<CarExpenseRecord>(
    "post",
    "/car-expense-records/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCarExpenseRecord = (data: { recordId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/car-expense-records/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type BudgetStatus = {
  month: string;
  limitAmount: number | null;
  spentAmount: number;
  remainingAmount: number | null;
};

export const getCarExpenseBudgetStatus = (data: { month?: string } = {}) => {
  return http.request<BudgetStatus>("post", "/car-expense-budgets/get", {
    data
  });
};

export const setCarExpenseBudgetLimit = (data: {
  month?: string;
  limitAmount: number;
}) => {
  return http.request<{ month: string; limitAmount: number }>(
    "post",
    "/car-expense-budgets/set",
    { data },
    { showSuccessMessage: true }
  );
};

export type CategoryBillItem = {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent?: number;
};

export type MonthlyCategoryBill = {
  month: string;
  totalAmount: number;
  categories: CategoryBillItem[];
};

export type YearlyCategoryBill = {
  year: number;
  totalAmount: number;
  categories: CategoryBillItem[];
};

export type MonthlySummaryItem = {
  month: string;
  totalAmount: number;
};

export type MonthlySummary = {
  year: number;
  months: MonthlySummaryItem[];
};

export const getCarExpenseMonthlyByCategory = (data: {
  month: string;
  includePercent?: boolean;
}) => {
  return http.request<MonthlyCategoryBill>(
    "post",
    "/car-expense-reports/monthly-by-category",
    { data }
  );
};

export const getCarExpenseYearlyByCategory = (data: {
  year: number;
  includePercent?: boolean;
}) => {
  return http.request<YearlyCategoryBill>(
    "post",
    "/car-expense-reports/yearly-by-category",
    { data }
  );
};

export const getCarExpenseMonthlySummary = (data: { year: number }) => {
  return http.request<MonthlySummary>(
    "post",
    "/car-expense-reports/monthly-summary",
    { data }
  );
};

export type MonthCategoryRecordListParams = {
  month: string;
  categoryId: string;
  page?: number;
  pageSize?: number;
};

export const getCarExpenseMonthCategoryRecords = (
  data: MonthCategoryRecordListParams
) => {
  return http.request<CarExpenseRecordListResult>(
    "post",
    "/car-expense-reports/month-category-records",
    { data }
  );
};

export type CarIncomeCategoryType = "system" | "custom";

export type CarIncomeCategory = {
  id: string;
  categoryId: string;
  name: string;
  seq: number;
  isEnabled: boolean;
  isHidden?: boolean;
  categoryType: CarIncomeCategoryType;
  createdAt: string;
  updatedAt: string;
};

export type GetCarIncomeCategoryListParams = {
  page?: number;
  pageSize?: number;
  nameKeyword?: string;
  isEnabled?: boolean;
  includeHidden?: boolean;
};

export type CarIncomeCategoryListResult = PageData<CarIncomeCategory>;

export type CreateCarIncomeCategoryPayload = {
  name: string;
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateCarIncomeCategoryPayload = {
  categoryId: string;
  name?: string;
  seq?: number;
  isEnabled?: boolean;
  isHidden?: boolean;
};

export const getCarIncomeCategoryList = (
  data: GetCarIncomeCategoryListParams = {}
) => {
  return http.request<CarIncomeCategoryListResult>(
    "post",
    "/car-income-categories",
    { data }
  );
};

export type GetCarIncomeCategoryListByUserParams =
  GetCarIncomeCategoryListParams & {
    userId: string;
  };

export const getCarIncomeCategoryListByUser = (
  data: GetCarIncomeCategoryListByUserParams
) => {
  return http.request<CarIncomeCategoryListResult>(
    "post",
    "/car-income-categories/by-user",
    { data }
  );
};

export const createCarIncomeCategory = (
  data: CreateCarIncomeCategoryPayload
) => {
  return http.request<CarIncomeCategory>(
    "post",
    "/car-income-categories/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCarIncomeCategory = (
  data: UpdateCarIncomeCategoryPayload
) => {
  return http.request<CarIncomeCategory>(
    "post",
    "/car-income-categories/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCarIncomeCategory = (data: { categoryId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/car-income-categories/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CarIncomeCategoryTemplate = {
  id: string;
  templateCategoryId: string;
  name: string;
  seq: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GetCarIncomeCategoryTemplateListParams = {
  page?: number;
  pageSize?: number;
  nameKeyword?: string;
  isEnabled?: boolean;
};

export type CarIncomeCategoryTemplateListResult =
  PageData<CarIncomeCategoryTemplate>;

export type CreateCarIncomeCategoryTemplatePayload = {
  name: string;
  seq?: number;
  isEnabled?: boolean;
};

export type UpdateCarIncomeCategoryTemplatePayload = {
  templateCategoryId: string;
  name?: string;
  seq?: number;
  isEnabled?: boolean;
};

export const getCarIncomeCategoryTemplateList = (
  data: GetCarIncomeCategoryTemplateListParams = {}
) => {
  return http.request<CarIncomeCategoryTemplateListResult>(
    "post",
    "/car-income-category-templates",
    { data }
  );
};

export const createCarIncomeCategoryTemplate = (
  data: CreateCarIncomeCategoryTemplatePayload
) => {
  return http.request<CarIncomeCategoryTemplate>(
    "post",
    "/car-income-category-templates/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCarIncomeCategoryTemplate = (
  data: UpdateCarIncomeCategoryTemplatePayload
) => {
  return http.request<CarIncomeCategoryTemplate>(
    "post",
    "/car-income-category-templates/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCarIncomeCategoryTemplate = (data: {
  templateCategoryId: string;
}) => {
  return http.request<DeleteResult>(
    "post",
    "/car-income-category-templates/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CarIncomeRecord = {
  id: string;
  recordId: string;
  date: string;
  categoryId: string;
  amount: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetCarIncomeRecordListParams = {
  page?: number;
  pageSize?: number;
  month?: string;
  categoryId?: string;
  keyword?: string;
};

export type CarIncomeRecordListResult = PageData<CarIncomeRecord>;

export type CreateCarIncomeRecordPayload = {
  date: string;
  categoryId: string;
  amount: number;
  remark?: string | null;
};

export type UpdateCarIncomeRecordPayload = {
  recordId: string;
  date?: string;
  categoryId?: string;
  amount?: number;
  remark?: string | null;
};

export const getCarIncomeRecordList = (
  data: GetCarIncomeRecordListParams = {}
) => {
  return http.request<CarIncomeRecordListResult>(
    "post",
    "/car-income-records",
    { data }
  );
};

export const createCarIncomeRecord = (data: CreateCarIncomeRecordPayload) => {
  return http.request<CarIncomeRecord>(
    "post",
    "/car-income-records/create",
    { data },
    { showSuccessMessage: true }
  );
};

export const updateCarIncomeRecord = (data: UpdateCarIncomeRecordPayload) => {
  return http.request<CarIncomeRecord>(
    "post",
    "/car-income-records/update",
    { data },
    { showSuccessMessage: true }
  );
};

export const deleteCarIncomeRecord = (data: { recordId: string }) => {
  return http.request<DeleteResult>(
    "post",
    "/car-income-records/delete",
    { data },
    { showSuccessMessage: true }
  );
};

export type CarIncomeMonthlyCategoryBill = MonthlyCategoryBill;
export type CarIncomeYearlyCategoryBill = YearlyCategoryBill;
export type CarIncomeMonthlySummary = MonthlySummary;

export const getCarIncomeMonthlyByCategory = (data: {
  month: string;
  includePercent?: boolean;
}) => {
  return http.request<CarIncomeMonthlyCategoryBill>(
    "post",
    "/car-income-reports/monthly-by-category",
    { data }
  );
};

export const getCarIncomeYearlyByCategory = (data: {
  year: number;
  includePercent?: boolean;
}) => {
  return http.request<CarIncomeYearlyCategoryBill>(
    "post",
    "/car-income-reports/yearly-by-category",
    { data }
  );
};

export const getCarIncomeMonthlySummary = (data: { year: number }) => {
  return http.request<CarIncomeMonthlySummary>(
    "post",
    "/car-income-reports/monthly-summary",
    { data }
  );
};

export const getCarIncomeMonthCategoryRecords = (
  data: MonthCategoryRecordListParams
) => {
  return http.request<CarIncomeRecordListResult>(
    "post",
    "/car-income-reports/month-category-records",
    { data }
  );
};

export type CashflowCategorySummary = {
  totalAmount: number;
  categories?: CategoryBillItem[];
};

export type MonthlyCashflowOverview = {
  month: string;
  incomeTotalAmount: number;
  expenseTotalAmount: number;
  netAmount: number;
  income: CashflowCategorySummary;
  expense: CashflowCategorySummary;
};

export const getCarCashflowMonthlyOverview = (data: {
  month: string;
  includeCategories?: boolean;
  includePercent?: boolean;
}) => {
  return http.request<MonthlyCashflowOverview>(
    "post",
    "/car-cashflow-reports/monthly-overview",
    { data }
  );
};

export type BillLogAction = "create" | "update" | "delete";

export type BillLogRecordType = "income" | "expense";

export type BillLogItem = {
  billLogId: string;
  userId: string;
  username: string;
  nickname: string;
  operatorUserId: string;
  operatorUsername: string;
  operatorNickname: string;
  recordType: BillLogRecordType;
  action: BillLogAction;
  recordId: string;
  billDate: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  remark: string | null;
  changedFields: string[];
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  createdAt: string;
};

export type GetBillLogListParams = {
  page?: number;
  pageSize?: number;
  userId?: string;
  month?: string;
  action?: BillLogAction;
};

export type BillLogListResult = PageData<BillLogItem>;

export const getBillLogs = (data: GetBillLogListParams = {}) => {
  return http.request<BillLogListResult>("post", "/bill-logs", { data });
};
