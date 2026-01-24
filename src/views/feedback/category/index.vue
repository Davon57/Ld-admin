<script setup lang="ts">
import {
  h,
  reactive,
  ref,
  computed,
  nextTick,
  defineComponent,
  resolveComponent
} from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog, closeDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES, isPageData } from "@/utils/table";
import {
  type FeedbackTypeItem,
  getFeedbackTypeList,
  getAllFeedbackTypes,
  createFeedbackType,
  updateFeedbackType,
  deleteFeedbackType
} from "@/api/feedbackType";

defineOptions({
  name: "FeedbackCategory"
});

const colors = {
  primary: "#3B82F6",
  secondary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827"
  }
} as const;

const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px"
} as const;

const FEEDBACK_TYPE_STORAGE_KEY = "pureadmin-feedback-types";

type FeedbackTypeFormModel = {
  name: string;
  description: string;
};

function syncTypeNamesToLocalStorage(list: FeedbackTypeItem[]): void {
  try {
    localStorage.setItem(
      FEEDBACK_TYPE_STORAGE_KEY,
      JSON.stringify(list.map(item => item.name))
    );
  } catch {
    void 0;
  }
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (!error || typeof error !== "object") return "请求失败";
  const maybeResponse = (error as { response?: unknown }).response;
  if (maybeResponse && typeof maybeResponse === "object") {
    const data = (maybeResponse as { data?: unknown }).data;
    if (data && typeof data === "object") {
      const err = (data as { error?: unknown }).error;
      if (typeof err === "string" && err.trim()) return err;
    }
  }
  const msg = (error as { message?: unknown }).message;
  return typeof msg === "string" && msg.trim() ? msg : "请求失败";
}

const loading = ref(false);
const tableData = ref<FeedbackTypeItem[]>([]);
const initing = ref(false);
const hasRows = computed((): boolean => tableData.value.length > 0);

type QueryState = {
  page: number;
  pageSize: number;
};

const queryState = reactive<QueryState>({
  page: 1,
  pageSize: 10
});

const paginationEnabled = ref(false);
const total = ref(0);

async function syncAllTypeNamesToLocalStorage(): Promise<void> {
  try {
    const all = await getAllFeedbackTypes({});
    syncTypeNamesToLocalStorage(all);
  } catch {
    void 0;
  }
}

const presetTypes = [
  {
    name: "系统问题",
    description: "如闪退、加载失败、功能异常等。"
  },
  {
    name: "功能建议",
    description: "如体验优化、功能需求、交互改进等。"
  },
  {
    name: "内容纠错",
    description: "如文章/问答信息错误、过期等"
  }
] as const;

const initExplainItems = computed(() => {
  return presetTypes.map(t => {
    return {
      title: t.name,
      description: t.description
    };
  });
});

function openInitExplainDialog(): void {
  const InitExplainDialog = defineComponent({
    name: "FeedbackCategoryInitExplainDialog",
    setup() {
      const ElAlert = resolveComponent("ElAlert");
      const ElDivider = resolveComponent("ElDivider");
      const ElTag = resolveComponent("ElTag");

      return () =>
        h(
          "div",
          {
            style: {
              padding: `${spacing[4]} ${spacing[5]}`
            }
          },
          [
            h(ElAlert as any, {
              title: "该操作用于快速创建默认反馈类别，仅在列表为空时可用。",
              type: "info",
              showIcon: true,
              closable: false
            }),
            h(ElDivider as any, { style: { margin: `${spacing[4]} 0` } }),
            h("div", { class: "text-sm", style: { color: colors.gray[700] } }, [
              h(
                "div",
                { class: "font-medium", style: { color: colors.gray[900] } },
                "将创建的默认类别"
              ),
              h(
                "div",
                {
                  class: "mt-2 space-y-2",
                  style: { marginTop: spacing[2] }
                },
                initExplainItems.value.map(item =>
                  h("div", { class: "flex items-start gap-2" }, [
                    h(
                      ElTag as any,
                      { type: "success", effect: "plain" },
                      () => item.title
                    ),
                    h(
                      "div",
                      {
                        class: "leading-6",
                        style: { color: colors.gray[700] }
                      },
                      item.description
                    )
                  ])
                )
              ),
              h(ElDivider as any, { style: { margin: `${spacing[4]} 0` } }),
              h(
                "div",
                { class: "font-medium", style: { color: colors.gray[900] } },
                "执行逻辑"
              ),
              h(
                "ol",
                {
                  class: "list-decimal pl-5 mt-2 space-y-1",
                  style: {
                    marginTop: spacing[2],
                    paddingLeft: "20px"
                  }
                },
                [
                  h(
                    "li",
                    "依次调用接口创建上述默认类别（逐条创建，失败不影响后续）。"
                  ),
                  h("li", "创建结束后刷新列表数据。"),
                  h("li", "弹出消息提示：成功/失败条数及部分失败原因。")
                ]
              ),
              h(ElDivider as any, { style: { margin: `${spacing[4]} 0` } }),
              h(
                "div",
                { class: "font-medium", style: { color: colors.gray[900] } },
                "不可用条件"
              ),
              h(
                "ul",
                {
                  class: "list-disc pl-5 mt-2 space-y-1",
                  style: {
                    marginTop: spacing[2],
                    paddingLeft: "20px"
                  }
                },
                [
                  h("li", "列表已有数据（为避免重复创建）。"),
                  h("li", "列表正在加载或初始化进行中。")
                ]
              )
            ])
          ]
        );
    }
  });

  addDialog({
    title: "初始化说明",
    width: "560px",
    closeOnClickModal: true,
    closeOnPressEscape: true,
    footerButtons: [
      {
        label: "我知道了",
        type: "primary",
        btnClick: ({ dialog: { options, index } }) => {
          if (!options || typeof index !== "number") return;
          closeDialog(options, index, { command: "close" });
        }
      }
    ],
    contentRenderer: () => h(InitExplainDialog)
  });
}

async function refresh(): Promise<void> {
  loading.value = true;
  try {
    const result = await getFeedbackTypeList({
      page: queryState.page,
      pageSize: queryState.pageSize
    });

    if (isPageData<FeedbackTypeItem>(result)) {
      paginationEnabled.value = true;
      total.value = result.total;
      tableData.value = result.list;
    } else {
      paginationEnabled.value = false;
      total.value = result.length;
      tableData.value = result;
    }

    void syncAllTypeNamesToLocalStorage();
  } catch (error) {
    message(getErrorMessage(error), { type: "error" });
  } finally {
    loading.value = false;
  }
}

async function onSizeChange(nextSize: number): Promise<void> {
  queryState.page = 1;
  queryState.pageSize = nextSize;
  await refresh();
}

async function onCurrentChange(nextPage: number): Promise<void> {
  queryState.page = nextPage;
  await refresh();
}

async function onInitPresetTypes(): Promise<void> {
  if (initing.value) return;
  initing.value = true;

  let successCount = 0;
  let failCount = 0;
  const errorMessages: string[] = [];

  try {
    for (const item of presetTypes) {
      try {
        await createFeedbackType({
          name: item.name,
          description: item.description
        });
        successCount += 1;
      } catch (error) {
        failCount += 1;
        errorMessages.push(getErrorMessage(error));
      }
    }

    queryState.page = 1;
    await refresh();

    if (failCount === 0) {
      message("初始化成功", { type: "success" });
      return;
    }

    const detail = errorMessages
      .map(v => v.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join("；");
    message(
      `初始化完成：成功 ${successCount} 条，失败 ${failCount} 条${detail ? `（${detail}${errorMessages.length > 2 ? " 等" : ""}）` : ""}`,
      { type: "warning" }
    );
  } finally {
    initing.value = false;
  }
}

type TypeFormMode = "create" | "edit";

const typeFormRules: FormRules<FeedbackTypeFormModel> = {
  name: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请输入类别名称"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  description: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (v.length > 200) return callback(new Error("描述不超过 200 字"));
        return callback();
      },
      trigger: "blur"
    }
  ]
};

function openTypeDialog(mode: TypeFormMode, row?: FeedbackTypeItem): void {
  const formRef = ref<FormInstance>();
  const originalId = mode === "edit" ? (row?.feedbackTypeId ?? "") : "";
  const model = reactive<FeedbackTypeFormModel>({
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : ""
  });

  const TypeFormDialog = defineComponent({
    name: "FeedbackTypeFormDialog",
    setup() {
      const ElForm = resolveComponent("ElForm");
      const ElFormItem = resolveComponent("ElFormItem");
      const ElInput = resolveComponent("ElInput");

      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () =>
        h(
          ElForm as any,
          {
            ref: formRef,
            model,
            rules: typeFormRules,
            labelWidth: "92px"
          },
          {
            default: () => [
              h(
                ElFormItem as any,
                { label: "类别", prop: "name" },
                {
                  default: () =>
                    h(ElInput as any, {
                      modelValue: model.name,
                      "onUpdate:modelValue": (v: string) => {
                        model.name = v;
                      },
                      placeholder: "例如：BUG 反馈",
                      clearable: true
                    })
                }
              ),
              h(
                ElFormItem as any,
                { label: "描述", prop: "description" },
                {
                  default: () =>
                    h(ElInput as any, {
                      type: "textarea",
                      rows: 3,
                      modelValue: model.description,
                      "onUpdate:modelValue": (v: string) => {
                        model.description = v;
                      },
                      placeholder: "可选，最多 200 字",
                      maxlength: 200,
                      showWordLimit: true
                    })
                }
              )
            ]
          }
        );
    }
  });

  addDialog({
    title: mode === "create" ? "新增类别" : "编辑类别",
    width: "520px",
    closeOnClickModal: false,
    contentRenderer: () => h(TypeFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();
        const name = model.name.trim();
        const description = model.description.trim();
        const exists = tableData.value.some(
          item => item.name === name && item.feedbackTypeId !== originalId
        );
        if (exists) {
          message("类别已存在", { type: "warning" });
          closeLoading();
          return;
        }

        if (mode === "create") {
          await createFeedbackType({
            name,
            description: description ? description : undefined
          });
          queryState.page = 1;
          await refresh();
          message("新增成功", { type: "success" });
          done();
          return;
        }

        await updateFeedbackType({
          feedbackTypeId: originalId,
          name,
          description: description ? description : undefined
        });
        await refresh();
        message("更新成功", { type: "success" });
        done();
      } catch (error) {
        message(getErrorMessage(error), { type: "error" });
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: FeedbackTypeItem): Promise<void> {
  try {
    await deleteFeedbackType({ feedbackTypeId: row.feedbackTypeId });
    if (
      paginationEnabled.value &&
      tableData.value.length <= 1 &&
      queryState.page > 1
    ) {
      queryState.page -= 1;
    }
    await refresh();
    message("删除成功", { type: "success" });
  } catch (error) {
    message(getErrorMessage(error), { type: "error" });
  }
}

void refresh();
</script>

<template>
  <div>
    <el-card shadow="never" :style="{ borderColor: colors.gray[200] }">
      <div class="flex items-center justify-between">
        <div>
          <div
            class="text-base font-medium"
            :style="{ color: colors.gray[900] }"
          >
            反馈类别
          </div>
          <div
            class="text-sm"
            :style="{ color: colors.gray[500], marginTop: spacing[1] }"
          >
            用于统一反馈类型选项，影响“反馈列表”的类型筛选与填写
          </div>
        </div>
        <el-space wrap>
          <el-button plain @click="openInitExplainDialog">说明</el-button>
          <el-popconfirm
            title="确认初始化三个默认类别？"
            confirm-button-text="初始化"
            confirm-button-type="success"
            cancel-button-text="取消"
            :disabled="loading || initing || hasRows"
            @confirm="onInitPresetTypes"
          >
            <template #reference>
              <el-button
                type="success"
                plain
                :loading="initing"
                :disabled="loading || initing || hasRows"
              >
                初始化
              </el-button>
            </template>
          </el-popconfirm>
          <el-button type="primary" @click="openTypeDialog('create')">
            新增类别
          </el-button>
        </el-space>
      </div>
    </el-card>

    <PureTableBar class="mt-2" title="类别列表" @refresh="refresh">
      <el-table
        :data="tableData"
        row-key="feedbackTypeId"
        border
        :loading="loading"
      >
        <el-table-column type="index" label="#" width="70" />
        <el-table-column prop="feedbackTypeId" label="编码" min-width="160" />
        <el-table-column prop="name" label="类别" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="280" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openTypeDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该类别？"
                confirm-button-text="删除"
                confirm-button-type="danger"
                cancel-button-text="取消"
                @confirm="onDeleteRow(row)"
              >
                <template #reference>
                  <el-button link type="danger">删除</el-button>
                </template>
              </el-popconfirm>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="paginationEnabled" class="flex justify-end pt-4">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="queryState.page"
          :page-size="queryState.pageSize"
          :page-sizes="DEFAULT_PAGE_SIZES"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
