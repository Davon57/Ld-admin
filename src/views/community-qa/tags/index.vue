<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  DEFAULT_PAGE_SIZES,
  exportToXlsx,
  isPageData,
  type CsvColumn
} from "@/utils/table";
import {
  type QaTagItem,
  type QaTagListParams,
  type QaTagListResult,
  getQaTagList,
  createQaTag,
  updateQaTag,
  deleteQaTag
} from "@/api/communityQa";

defineOptions({
  name: "CommunityQaTags"
});

const queryState = reactive<
  Required<Pick<QaTagListParams, "page" | "pageSize">> & {
    qaTagId: string;
    nameKeyword: string;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  qaTagId: "",
  nameKeyword: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<QaTagItem[]>([]);
const total = ref(0);

const exporting = ref(false);

const exportColumns: CsvColumn<QaTagItem>[] = [
  { label: "标签ID", key: "qaTagId" },
  { label: "名称", key: "name" },
  { label: "描述", key: "description" },
  { label: "排序号", key: "seq" },
  {
    label: "启用",
    key: "isEnabled",
    format: (_value, row) => (row.isEnabled ? "启用" : "禁用")
  },
  { label: "更新时间", key: "updatedAt" }
];

const listParams = computed((): QaTagListParams => {
  const params: QaTagListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const qaTagId = queryState.qaTagId.trim();
  if (qaTagId) params.qaTagId = qaTagId;
  const nameKeyword = queryState.nameKeyword.trim();
  if (nameKeyword) params.nameKeyword = nameKeyword;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

function normalizeListResult(res: QaTagListResult): {
  list: QaTagItem[];
  total: number;
} {
  if (isPageData<QaTagItem>(res)) {
    return { list: res.list, total: res.total };
  }
  return { list: res, total: res.length };
}

async function fetchTags(): Promise<void> {
  loading.value = true;
  try {
    const res = await getQaTagList(listParams.value);
    const normalized = normalizeListResult(res);
    tableData.value = normalized.list;
    total.value = normalized.total;
  } catch {
    tableData.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchTags();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.qaTagId = "";
  queryState.nameKeyword = "";
  queryState.isEnabled = "";
  fetchTags();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchTags();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchTags();
}

async function onExportList(): Promise<void> {
  if (tableData.value.length === 0) {
    message("暂无可导出数据", { type: "warning" });
    return;
  }
  exporting.value = true;
  try {
    await exportToXlsx(tableData.value, exportColumns, "问答标签列表");
  } catch {
    message("导出失败", { type: "error" });
  } finally {
    exporting.value = false;
  }
}

type TagFormMode = "create" | "edit";

type TagFormModel = {
  qaTagId?: string;
  name: string;
  description: string;
  seq: number;
  isEnabled: boolean;
};

const tagFormRules: FormRules<TagFormModel> = {
  name: [{ required: true, message: "请输入标签名称", trigger: "blur" }]
};

function openTagDialog(mode: TagFormMode, row?: QaTagItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<TagFormModel>({
    qaTagId: mode === "edit" ? row?.qaTagId : undefined,
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    seq: mode === "edit" ? (row?.seq ?? 0) : 0,
    isEnabled: mode === "edit" ? (row?.isEnabled ?? true) : true
  });

  const TagFormDialog = defineComponent({
    name: "QaTagFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={tagFormRules}
          label-width="90px"
        >
          {mode === "edit" ? (
            <el-form-item label="标签ID">
              <el-input v-model={model.qaTagId} disabled />
            </el-form-item>
          ) : null}
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              placeholder="请输入标签名称"
              clearable
            />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model={model.description}
              type="textarea"
              autosize={{ minRows: 3, maxRows: 6 }}
              placeholder="可选，填写标签描述"
              clearable
            />
          </el-form-item>
          <el-form-item label="排序号">
            <el-input-number
              v-model={model.seq}
              min={0}
              step={1}
              controls-position="right"
              class="w-full"
            />
          </el-form-item>
          <el-form-item label="启用">
            <el-segmented
              v-model={model.isEnabled}
              options={[
                { label: "启用", value: true },
                { label: "禁用", value: false }
              ]}
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增标签" : "编辑标签",
    width: "520px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(TagFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const payloadBase = {
          name: model.name.trim(),
          description: model.description.trim() || undefined,
          seq: Math.max(0, Math.floor(model.seq)),
          isEnabled: model.isEnabled
        };

        if (mode === "create") {
          const res = await createQaTag(payloadBase);
          void res;
          done();
          queryState.page = 1;
          fetchTags();
          return;
        }

        if (!model.qaTagId) {
          message("标签信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updateQaTag({
          qaTagId: model.qaTagId,
          ...payloadBase
        });
        void res;
        done();
        fetchTags();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: QaTagItem): Promise<void> {
  try {
    const res = await deleteQaTag({ qaTagId: row.qaTagId });
    void res;
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchTags();
  } catch {}
}

fetchTags();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.nameKeyword"
            placeholder="按标签名搜索"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="标签ID">
          <el-input
            v-model="queryState.qaTagId"
            placeholder="LD0001ABCD"
            clearable
            class="w-[200px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="启用">
          <el-select
            v-model="queryState.isEnabled"
            clearable
            class="w-[160px]!"
          >
            <el-option label="全部" value="" />
            <el-option label="启用" :value="true" />
            <el-option label="禁用" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="问答标签" @refresh="fetchTags">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openTagDialog('create')">
            新增标签
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

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="qaTagId"
        class="w-full"
      >
        <el-table-column prop="qaTagId" label="标签ID" min-width="140" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="description" label="描述" min-width="240" />
        <el-table-column prop="seq" label="排序" width="90" />
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openTagDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该标签？"
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
