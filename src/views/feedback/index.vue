<script setup lang="ts">
import {
  h,
  reactive,
  ref,
  computed,
  onMounted,
  onActivated,
  nextTick,
  defineComponent,
  resolveComponent
} from "vue";
import type {
  FormInstance,
  FormRules,
  UploadProps,
  UploadUserFile
} from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES, isPageData } from "@/utils/table";
import { useUserStoreHook } from "@/store/modules/user";
import {
  type FeedbackItem,
  type FeedbackImage,
  type FeedbackListParams,
  getFeedbackList,
  createFeedback,
  updateFeedback,
  deleteFeedback
} from "@/api/feedback";
import { getAllFeedbackTypes } from "@/api/feedbackType";
import Plus from "~icons/ep/plus";

defineOptions({
  name: "FeedbackManage"
});

type QueryState = {
  page: number;
  pageSize: number;
  keyword: string;
  type: string;
};

const queryState = reactive<QueryState>({
  page: 1,
  pageSize: 10,
  keyword: "",
  type: ""
});

const loading = ref(false);
const allRows = ref<FeedbackItem[]>([]);
const serverRows = ref<FeedbackItem[]>([]);
const paginationEnabled = ref(false);
const total = ref(0);

const FEEDBACK_TYPE_STORAGE_KEY = "pureadmin-feedback-types";
const defaultTypePresetOptions = ["bug", "feature", "complaint", "other"];

function uniqStringList(list: string[]): string[] {
  const next: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const v = (item ?? "").trim();
    if (!v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    next.push(v);
  }
  return next;
}

function loadTypePresetOptions(): string[] {
  try {
    const raw = localStorage.getItem(FEEDBACK_TYPE_STORAGE_KEY);
    if (!raw) return defaultTypePresetOptions;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultTypePresetOptions;
    const items = parsed.filter(v => typeof v === "string") as string[];
    const normalized = uniqStringList(items);
    return normalized.length ? normalized : defaultTypePresetOptions;
  } catch {
    return defaultTypePresetOptions;
  }
}

const typePresetOptions = ref<string[]>([]);

function refreshTypePresetOptions(): void {
  typePresetOptions.value = loadTypePresetOptions();
}

async function syncTypePresetOptionsFromServer(): Promise<void> {
  try {
    const list = await getAllFeedbackTypes({});
    const names = uniqStringList(list.map(item => item.name));
    localStorage.setItem(FEEDBACK_TYPE_STORAGE_KEY, JSON.stringify(names));
  } catch {
    void 0;
  }
}

onMounted(() => {
  void syncTypePresetOptionsFromServer().finally(() => {
    refreshTypePresetOptions();
  });
});

onActivated(() => {
  refreshTypePresetOptions();
});

const filteredRows = computed((): FeedbackItem[] => {
  const keyword = queryState.keyword.trim().toLowerCase();
  const type = queryState.type.trim();

  return allRows.value.filter(row => {
    if (type && row.type !== type) return false;
    if (!keyword) return true;

    const operatorText = (row.cby ?? row.userId ?? "").trim();
    const fields = [
      operatorText,
      row.type,
      row.description,
      row.contact ?? "",
      row.env
    ];

    return fields.some(v => (v ?? "").toLowerCase().includes(keyword));
  });
});

const tableData = computed((): FeedbackItem[] =>
  paginationEnabled.value ? serverRows.value : filteredRows.value
);

const listParams = computed((): FeedbackListParams => {
  const params: FeedbackListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  const type = queryState.type.trim();
  if (keyword) params.keyword = keyword;
  if (type) params.type = type;
  return params;
});

async function fetchFeedbacks(): Promise<void> {
  loading.value = true;
  try {
    const res = await getFeedbackList(listParams.value);
    if (isPageData<FeedbackItem>(res)) {
      paginationEnabled.value = true;
      serverRows.value = res.list;
      total.value = res.total;
      return;
    }

    paginationEnabled.value = false;
    allRows.value = Array.isArray(res) ? res : [];
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
    allRows.value = [];
    serverRows.value = [];
    paginationEnabled.value = false;
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchFeedbacks();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.type = "";
  fetchFeedbacks();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchFeedbacks();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchFeedbacks();
}

async function readAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid file result"));
    };
    reader.onerror = () => reject(new Error("Read file failed"));
    reader.readAsDataURL(file);
  });
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Invalid blob result"));
    };
    reader.onerror = () => reject(new Error("Read blob failed"));
    reader.readAsDataURL(blob);
  });
}

async function loadImageBitmap(
  file: File
): Promise<
  | { kind: "bitmap"; bitmap: ImageBitmap; width: number; height: number }
  | { kind: "img"; img: HTMLImageElement; width: number; height: number }
> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        kind: "bitmap",
        bitmap,
        width: bitmap.width,
        height: bitmap.height
      };
    } catch {}
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Load image failed"));
      el.src = objectUrl;
    });
    return {
      kind: "img",
      img,
      width: img.naturalWidth,
      height: img.naturalHeight
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob | null> {
  return await new Promise(resolve => {
    canvas.toBlob(
      blob => resolve(blob),
      mimeType,
      typeof quality === "number" ? quality : undefined
    );
  });
}

async function compressImageToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) return await readAsDataUrl(file);

  const maxWidth = 1600;
  const maxHeight = 1600;
  const maxBytes = 350 * 1024;
  const qualityStart = 0.82;
  const qualityMin = 0.55;
  const qualityStep = 0.07;

  const source = await loadImageBitmap(file);
  const scale = Math.min(
    1,
    maxWidth / Math.max(1, source.width),
    maxHeight / Math.max(1, source.height)
  );
  const targetWidth = Math.max(1, Math.round(source.width * scale));
  const targetHeight = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return await readAsDataUrl(file);

  if (source.kind === "bitmap") {
    ctx.drawImage(source.bitmap, 0, 0, targetWidth, targetHeight);
    if (typeof source.bitmap.close === "function") source.bitmap.close();
  } else {
    ctx.drawImage(source.img, 0, 0, targetWidth, targetHeight);
  }

  let mimeType = "image/webp";
  let quality = qualityStart;
  let blob = await canvasToBlob(canvas, mimeType, quality);

  if (!blob) {
    mimeType = "image/jpeg";
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  if (!blob) return await readAsDataUrl(file);

  while (blob.size > maxBytes && quality > qualityMin) {
    quality = Math.max(qualityMin, quality - qualityStep);
    const next = await canvasToBlob(canvas, mimeType, quality);
    if (!next) break;
    blob = next;
  }

  return await blobToDataUrl(blob);
}

type FeedbackFormMode = "create" | "edit";

type FeedbackFormModel = {
  feedbackId?: string;
  userId: string;
  type: string;
  description: string;
  contact: string;
  env: string;
  images: FeedbackImage[];
};

const feedbackFormRules: FormRules<FeedbackFormModel> = {
  type: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请输入反馈类型"));
        return callback();
      },
      trigger: "change"
    }
  ],
  description: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请输入描述"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  env: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请输入环境信息"));
        return callback();
      },
      trigger: "blur"
    }
  ]
};

function openFeedbackDialog(mode: FeedbackFormMode, row?: FeedbackItem): void {
  const formRef = ref<FormInstance>();
  const userStore = useUserStoreHook();
  const defaultUserId = userStore.profile?.userId || "";
  const defaultEnv =
    typeof navigator !== "undefined" ? navigator.userAgent : "";

  const model = reactive<FeedbackFormModel>({
    feedbackId: mode === "edit" ? row?.feedbackId : undefined,
    userId: mode === "edit" ? (row?.userId ?? "") : defaultUserId,
    type: mode === "edit" ? (row?.type ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    contact: mode === "edit" ? (row?.contact ?? "") : "",
    env: mode === "edit" ? (row?.env ?? "") : defaultEnv,
    images: mode === "edit" ? (row?.images ?? []) : []
  });

  const fileList = computed((): UploadUserFile[] => {
    return model.images.map((img, index) => {
      return {
        name: `image-${index + 1}`,
        url: img.url
      };
    });
  });

  const onChange: UploadProps["onChange"] = async uploadFile => {
    if (model.images.length >= 6) {
      message("最多上传 6 张图片", { type: "warning" });
      return;
    }

    const raw = uploadFile.raw;
    if (!(raw instanceof File)) return;

    try {
      const dataUrl = await compressImageToDataUrl(raw);
      if (model.images.some(img => img.url === dataUrl)) return;
      model.images.push({
        url: dataUrl,
        uploadTime: new Date().toISOString()
      });
    } catch {
      message("读取图片失败", { type: "error" });
    }
  };

  const onRemove: UploadProps["onRemove"] = uploadFile => {
    const url = uploadFile.url;
    if (typeof url !== "string") return;
    const idx = model.images.findIndex(img => img.url === url);
    if (idx >= 0) model.images.splice(idx, 1);
  };

  const FeedbackFormDialog = defineComponent({
    name: "FeedbackFormDialog",
    setup() {
      const ElForm = resolveComponent("ElForm");
      const ElFormItem = resolveComponent("ElFormItem");
      const ElIcon = resolveComponent("ElIcon");
      const ElInput = resolveComponent("ElInput");
      const ElSelect = resolveComponent("ElSelect");
      const ElOption = resolveComponent("ElOption");
      const ElUpload = resolveComponent("ElUpload");

      nextTick(() => {
        if (typeof formRef.value?.clearValidate === "function") {
          formRef.value.clearValidate();
        }
      });

      return () =>
        h(
          ElForm as any,
          {
            ref: formRef,
            model,
            rules: feedbackFormRules,
            labelWidth: "96px"
          },
          {
            default: () => [
              h(
                ElFormItem as any,
                { label: "类型", prop: "type" },
                {
                  default: () =>
                    h(
                      ElSelect as any,
                      {
                        modelValue: model.type,
                        "onUpdate:modelValue": (v: string) => {
                          model.type = v;
                        },
                        class: "w-full",
                        filterable: true,
                        allowCreate: true,
                        defaultFirstOption: true,
                        placeholder: "例如：bug"
                      },
                      {
                        default: () =>
                          typePresetOptions.value.map(opt =>
                            h(ElOption as any, {
                              key: opt,
                              label: opt,
                              value: opt
                            })
                          )
                      }
                    )
                }
              ),
              h(
                ElFormItem as any,
                { label: "描述", prop: "description" },
                {
                  default: () =>
                    h(ElInput as any, {
                      modelValue: model.description,
                      "onUpdate:modelValue": (v: string) => {
                        model.description = v;
                      },
                      type: "textarea",
                      rows: 6,
                      resize: "vertical",
                      placeholder: "请描述问题或建议"
                    })
                }
              ),
              h(
                ElFormItem as any,
                { label: "联系方式", prop: "contact" },
                {
                  default: () =>
                    h(ElInput as any, {
                      modelValue: model.contact,
                      "onUpdate:modelValue": (v: string) => {
                        model.contact = v;
                      },
                      placeholder: "可选",
                      autocomplete: "tel",
                      clearable: true
                    })
                }
              ),
              h(
                ElFormItem as any,
                { label: "环境信息", prop: "env" },
                {
                  default: () =>
                    h(ElInput as any, {
                      modelValue: model.env,
                      "onUpdate:modelValue": (v: string) => {
                        model.env = v;
                      },
                      type: "textarea",
                      rows: 3,
                      resize: "vertical",
                      placeholder: "例如：Windows 11 / Chrome 120"
                    })
                }
              ),
              h(
                ElFormItem as any,
                { label: "图片", prop: "images" },
                {
                  default: () =>
                    h(
                      ElUpload as any,
                      {
                        action: "/",
                        autoUpload: false,
                        multiple: true,
                        accept: "image/*",
                        listType: "picture-card",
                        limit: 6,
                        fileList: fileList.value,
                        onChange,
                        onRemove
                      },
                      {
                        default: () =>
                          h(ElIcon as any, null, {
                            default: () => [h(Plus)]
                          })
                      }
                    )
                }
              )
            ]
          }
        );
    }
  });

  addDialog({
    title: mode === "create" ? "新增反馈" : "编辑反馈",
    width: "760px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(FeedbackFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const type = model.type.trim();
        const description = model.description.trim();
        const env = model.env.trim();

        const cby = (
          userStore.username ||
          userStore.profile?.username ||
          ""
        ).trim();
        if (!cby) {
          message("当前登录用户信息缺失，请重新登录", { type: "error" });
          closeLoading();
          return;
        }

        if (mode === "create") {
          const res = await createFeedback({
            cby,
            type,
            description,
            contact: model.contact.trim() ? model.contact.trim() : null,
            env,
            images: model.images.length ? model.images : undefined
          });
          if (!res?.feedbackId) {
            message("新增失败", { type: "error" });
            closeLoading();
            return;
          }
          message("新增成功", { type: "success" });
          done();
          fetchFeedbacks();
          return;
        }

        if (!model.feedbackId) {
          message("反馈信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateFeedback({
          feedbackId: model.feedbackId,
          cby,
          type,
          description,
          contact: model.contact.trim() ? model.contact.trim() : null,
          env,
          images: model.images
        });
        if (!res?.feedbackId) {
          message("更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
        done();
        fetchFeedbacks();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: FeedbackItem): Promise<void> {
  try {
    const res = await deleteFeedback({ feedbackId: row.feedbackId });
    if (!res?.ok) {
      message("删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (
      paginationEnabled.value &&
      queryState.page > 1 &&
      tableData.value.length === 1
    ) {
      queryState.page -= 1;
    }
    fetchFeedbacks();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
}

fetchFeedbacks();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="操作人/类型/描述/联系方式/环境"
            clearable
            class="w-[260px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="类型">
          <el-select
            v-model="queryState.type"
            clearable
            filterable
            allow-create
            default-first-option
            class="w-[180px]!"
            placeholder="全部"
          >
            <el-option
              v-for="opt in typePresetOptions"
              :key="opt"
              :label="opt"
              :value="opt"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="反馈列表" @refresh="fetchFeedbacks">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openFeedbackDialog('create')">
            新增反馈
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="feedbackId"
        class="w-full"
      >
        <el-table-column
          prop="feedbackId"
          label="编码"
          width="160"
          show-overflow-tooltip
        />
        <el-table-column prop="type" label="类型" width="140">
          <template #default="{ row }">
            <el-tag effect="plain">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="description"
          label="描述"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column
          prop="contact"
          label="联系方式"
          width="160"
          show-overflow-tooltip
        />
        <el-table-column label="图片" width="110">
          <template #default="{ row }">
            <el-image
              v-if="row.images && row.images.length"
              :src="row.images[0].url"
              fit="cover"
              class="h-8 w-8 rounded"
              :preview-src-list="row.images.map(i => i.url)"
              preview-teleported
            />
            <div
              v-else
              class="h-8 w-8 rounded bg-[var(--el-fill-color-light)]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column label="操作人" width="160">
          <template #default="{ row }">
            {{ (row.cby ?? row.userId) || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openFeedbackDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该反馈？"
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
