<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  type CsvColumn
} from "@/utils/table";
import {
  type AvatarItem,
  type AvatarListParams,
  getAvatarList,
  createAvatar,
  updateAvatar,
  deleteAvatar
} from "@/api/avatar";

defineOptions({
  name: "SystemAvatar"
});

const colors = {
  primary: "#3B82F6",
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    600: "#4B5563",
    900: "#111827"
  }
} as const;

const spacing = {
  1: "4px",
  2: "8px",
  4: "16px",
  6: "24px"
} as const;

const codeTagStyle = {
  borderColor: colors.primary,
  color: colors.primary
} as const;

type EnabledOption = { label: string; value: boolean };
const enabledOptions: EnabledOption[] = [
  { label: "启用", value: true },
  { label: "禁用", value: false }
];

const queryState = reactive<
  Required<Pick<AvatarListParams, "page" | "pageSize">> & {
    includeDisabled: boolean;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  includeDisabled: true,
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<AvatarItem[]>([]);
const total = ref(0);

const exporting = ref(false);

const exportColumns: CsvColumn<AvatarItem>[] = [
  { label: "编码", key: "avatarId" },
  { label: "描述", key: "description" },
  {
    label: "状态",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "禁用")
  },
  { label: "创建时间", key: "createdAt" },
  { label: "修改时间", key: "updatedAt" }
];

const listParams = computed((): AvatarListParams => {
  const params: AvatarListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  if (queryState.includeDisabled) params.includeDisabled = true;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchAvatars(): Promise<void> {
  loading.value = true;
  try {
    const res = await getAvatarList(listParams.value);
    tableData.value = res.list;
    total.value = res.total;
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchAvatars();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.includeDisabled = true;
  queryState.isEnabled = "";
  fetchAvatars();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchAvatars();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchAvatars();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "头像库");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type AvatarFormMode = "create" | "edit";

type AvatarFormModel = {
  avatarId?: string;
  imageBase64: string;
  description: string;
  isEnabled: boolean;
};

function inferMimeFromBase64(base64: string): string {
  const v = (base64 ?? "").trim();
  if (!v) return "image/png";
  if (v.startsWith("iVBORw0KGgo")) return "image/png";
  if (v.startsWith("/9j/")) return "image/jpeg";
  if (v.startsWith("R0lGOD")) return "image/gif";
  if (v.startsWith("UklGR")) return "image/webp";
  if (v.startsWith("PHN2Zy")) return "image/svg+xml";
  return "image/png";
}

function toImageDataUrl(base64: string): string {
  const v = (base64 ?? "").trim();
  if (!v) return "";
  if (v.startsWith("data:")) return v;
  return `data:${inferMimeFromBase64(v)};base64,${v}`;
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

const avatarFormRules: FormRules<AvatarFormModel> = {
  imageBase64: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (!v) return callback(new Error("请选择图片"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  description: [
    {
      validator: (_rule, value: string, callback) => {
        const v = (value ?? "").trim();
        if (v.length > 50) return callback(new Error("描述最长 50"));
        return callback();
      },
      trigger: "blur"
    }
  ],
  isEnabled: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function openAvatarDialog(mode: AvatarFormMode, row?: AvatarItem): void {
  const formRef = ref<FormInstance>();
  const fileInputRef = ref<HTMLInputElement>();
  const model = reactive<AvatarFormModel>({
    avatarId: mode === "edit" ? row?.avatarId : undefined,
    imageBase64: mode === "edit" ? (row?.imageBase64 ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    isEnabled: mode === "edit" ? (row?.isEnabled ?? true) : true
  });

  const AvatarFormDialog = defineComponent({
    name: "AvatarFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={avatarFormRules}
          label-width="90px"
        >
          <el-form-item label="图片" prop="imageBase64">
            <div class="w-full">
              <div class="flex items-center" style={{ gap: spacing[2] }}>
                {model.imageBase64.trim() ? (
                  <el-image
                    src={toImageDataUrl(model.imageBase64)}
                    fit="cover"
                    class="h-10 w-10 rounded-full"
                    preview-src-list={[toImageDataUrl(model.imageBase64)]}
                    preview-teleported
                  />
                ) : (
                  <div class="h-10 w-10 rounded-full bg-[var(--el-fill-color-light)]" />
                )}
                <div class="flex-1">
                  <el-button
                    type="primary"
                    plain
                    onClick={() => fileInputRef.value?.click()}
                  >
                    选择图片
                  </el-button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    class="hidden"
                    onChange={async e => {
                      const input = e.target as HTMLInputElement;
                      const file = input.files?.[0];
                      input.value = "";
                      if (!file) return;
                      try {
                        const dataUrl = await readAsDataUrl(file);
                        const commaIndex = dataUrl.indexOf(",");
                        const base64 =
                          commaIndex >= 0
                            ? dataUrl.slice(commaIndex + 1)
                            : dataUrl;
                        model.imageBase64 = base64;
                      } catch {
                        message("读取图片失败", { type: "error" });
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input
              v-model={model.description}
              placeholder="最长 50"
              clearable
              maxlength={50}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="状态" prop="isEnabled">
            <el-segmented
              v-model={model.isEnabled}
              options={enabledOptions.map(s => ({
                label: s.label,
                value: s.value
              }))}
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增头像" : "编辑头像",
    width: "640px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(AvatarFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const imageBase64 = model.imageBase64.trim();
        const description = model.description.trim();

        if (mode === "create") {
          await createAvatar({
            imageBase64,
            description,
            isEnabled: model.isEnabled
          });
          done();
          queryState.page = 1;
          fetchAvatars();
          return;
        }

        if (!model.avatarId) {
          message("头像信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateAvatar({
          avatarId: model.avatarId,
          imageBase64,
          description,
          isEnabled: model.isEnabled
        });
        done();
        fetchAvatars();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: AvatarItem): Promise<void> {
  try {
    await deleteAvatar({ avatarId: row.avatarId });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchAvatars();
  } catch {}
}

fetchAvatars();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="启用状态">
          <el-select
            v-model="queryState.isEnabled"
            clearable
            class="w-[160px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in enabledOptions"
              :key="String(opt.value)"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="包含禁用">
          <el-switch v-model="queryState.includeDisabled" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="头像库" @refresh="fetchAvatars">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openAvatarDialog('create')">
            新增头像
          </el-button>
          <el-button
            type="success"
            plain
            :loading="exporting"
            @click="onExportList"
          >
            导出列表
          </el-button>
        </el-space>
      </template>

      <el-table :data="tableData" :loading="loading" row-key="avatarId">
        <el-table-column label="头像" width="76">
          <template #default="{ row }">
            <el-image
              v-if="row.imageBase64"
              :src="toImageDataUrl(row.imageBase64)"
              fit="cover"
              class="h-9 w-9 rounded-full"
              :preview-src-list="[toImageDataUrl(row.imageBase64)]"
              preview-teleported
            />
            <div
              v-else
              class="h-9 w-9 rounded-full bg-[var(--el-fill-color-light)]"
            />
          </template>
        </el-table-column>
        <el-table-column prop="avatarId" label="编码" min-width="120">
          <template #default="{ row }">
            <el-tag :style="codeTagStyle" effect="plain">
              {{ row.avatarId }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="240" />
        <el-table-column prop="isEnabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="修改时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openAvatarDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该头像？"
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

      <div class="flex justify-end pt-4">
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
