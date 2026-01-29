<script setup lang="tsx">
import {
  h,
  reactive,
  ref,
  computed,
  nextTick,
  defineComponent,
  onMounted
} from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  type CommunityQaItem,
  type CommunityQaListParams,
  type CommunityQaCategory,
  type CommunityQaContentBlock,
  getCommunityQaList,
  createCommunityQa,
  updateCommunityQa,
  deleteCommunityQa,
  getCommunityQaCategoryList
} from "@/api/communityQaManage";

defineOptions({
  name: "CommunityQaManageList"
});

const queryState = reactive<
  Required<Pick<CommunityQaListParams, "page" | "pageSize">> & {
    keyword: string;
    categoryId: "" | string;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  categoryId: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<CommunityQaItem[]>([]);
const total = ref(0);

const categoryOptionsLoading = ref(false);
const categoryOptions = ref<CommunityQaCategory[]>([]);

const listParams = computed((): CommunityQaListParams => {
  const params: CommunityQaListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.categoryId !== "") params.categoryId = queryState.categoryId;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchCategoryOptions(): Promise<void> {
  categoryOptionsLoading.value = true;
  try {
    const res = await getCommunityQaCategoryList({
      page: 1,
      pageSize: 1000
    });
    categoryOptions.value = res.list;
  } catch {
    categoryOptions.value = [];
  } finally {
    categoryOptionsLoading.value = false;
  }
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCommunityQaList(listParams.value);
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
  fetchList();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.categoryId = "";
  queryState.isEnabled = "";
  fetchList();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchList();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchList();
}

type QaFormMode = "create" | "edit";

type QaFormModel = {
  title: string;
  categoryId: string;
  isEnabled: boolean;
  contentBlocks: CommunityQaContentBlock[];
};

const qaFormRules: FormRules<QaFormModel> = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  categoryId: [{ required: true, message: "请选择分类", trigger: "change" }]
};

function normalizeBlocks(
  input: CommunityQaContentBlock[]
): CommunityQaContentBlock[] {
  const out: CommunityQaContentBlock[] = [];
  const blocks = Array.isArray(input) ? input : [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const title = (b?.title ?? "").trim();
    const content = (b?.content ?? "").trim();
    if (!title && !content) continue;
    if (!title || !content) {
      return [];
    }
    out.push({ title, content, seq: out.length });
    if (out.length >= 200) break;
  }
  return out;
}

function openQaDialog(mode: QaFormMode, row?: CommunityQaItem): void {
  const formRef = ref<FormInstance>();

  const model = reactive<QaFormModel>({
    title: mode === "edit" ? (row?.title ?? "") : "",
    categoryId: mode === "edit" ? (row?.categoryId ?? "") : "",
    isEnabled: mode === "edit" ? Boolean(row?.isEnabled) : true,
    contentBlocks:
      mode === "edit" && Array.isArray(row?.contentBlocks)
        ? row!.contentBlocks.map(b => ({
            title: b.title ?? "",
            content: b.content ?? "",
            seq: typeof b.seq === "number" ? b.seq : 0
          }))
        : []
  });

  const QaFormDialog = defineComponent({
    name: "CommunityQaManageQaFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      const addBlock = () => {
        if (model.contentBlocks.length >= 200) {
          message("正文块最多 200 条", { type: "warning" });
          return;
        }
        model.contentBlocks.push({
          title: "",
          content: "",
          seq: model.contentBlocks.length
        });
      };

      const syncSeq = () => {
        model.contentBlocks.forEach((b, index) => {
          b.seq = index;
        });
      };

      const moveBlock = (from: number, to: number) => {
        if (from === to) return;
        if (from < 0 || from >= model.contentBlocks.length) return;
        if (to < 0 || to >= model.contentBlocks.length) return;
        const item = model.contentBlocks[from];
        model.contentBlocks.splice(from, 1);
        model.contentBlocks.splice(to, 0, item);
        syncSeq();
      };

      const deleteBlock = (index: number) => {
        if (index < 0 || index >= model.contentBlocks.length) return;
        model.contentBlocks.splice(index, 1);
        syncSeq();
      };

      return () => (
        <div class="space-y-3">
          <el-form
            ref={formRef}
            model={model}
            rules={qaFormRules}
            label-width="100px"
          >
            <el-form-item label="标题" prop="title">
              <el-input
                v-model={model.title}
                clearable
                maxlength={100}
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="分类" prop="categoryId">
              <el-select
                v-model={model.categoryId}
                filterable
                clearable
                loading={categoryOptionsLoading.value}
                class="w-full"
                placeholder="请选择分类"
              >
                {categoryOptions.value.map(c => (
                  <el-option
                    key={c.communityQaCategoryId}
                    label={`${c.name}（${c.communityQaCategoryId}）`}
                    value={c.communityQaCategoryId}
                  />
                ))}
              </el-select>
            </el-form-item>
            <el-form-item label="启用">
              <el-switch v-model={model.isEnabled} />
            </el-form-item>
          </el-form>

          <el-card shadow="never">
            <div class="flex items-center justify-between">
              <div class="text-[14px]">正文块</div>
              <el-button type="primary" plain onClick={addBlock}>
                新增正文块
              </el-button>
            </div>

            <div class="mt-3 space-y-3">
              {model.contentBlocks.length === 0 ? (
                <div class="text-[13px] text-[var(--el-text-color-secondary)]">
                  暂无正文块
                </div>
              ) : null}
              {model.contentBlocks.map((b, index) => (
                <el-card
                  key={index}
                  shadow="never"
                  class="!border-[var(--el-border-color)]"
                >
                  <div class="flex items-center justify-between gap-2">
                    <div class="text-[13px] font-medium">第 {index + 1} 段</div>
                    <el-space>
                      <el-button
                        link
                        type="primary"
                        disabled={index === 0}
                        onClick={() => moveBlock(index, index - 1)}
                      >
                        上移
                      </el-button>
                      <el-button
                        link
                        type="primary"
                        disabled={index === model.contentBlocks.length - 1}
                        onClick={() => moveBlock(index, index + 1)}
                      >
                        下移
                      </el-button>
                      <el-button
                        link
                        type="danger"
                        onClick={() => deleteBlock(index)}
                      >
                        删除
                      </el-button>
                    </el-space>
                  </div>

                  <div class="mt-3 space-y-3">
                    <el-input
                      v-model={b.title}
                      clearable
                      maxlength={100}
                      show-word-limit
                      placeholder="小标题"
                    />
                    <el-input
                      v-model={b.content}
                      type="textarea"
                      rows={4}
                      resize="vertical"
                      maxlength={20000}
                      show-word-limit
                      placeholder="正文内容"
                    />
                  </div>
                </el-card>
              ))}
            </div>
          </el-card>
        </div>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增QA" : "编辑QA",
    width: "980px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(QaFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const title = model.title.trim();
        const categoryId = model.categoryId.trim();
        const blocks = normalizeBlocks(model.contentBlocks);

        if (
          model.contentBlocks.some(
            b => (b.title ?? "").trim() || (b.content ?? "").trim()
          ) &&
          blocks.length === 0
        ) {
          message("正文块需同时填写小标题与正文（可删除空段）", {
            type: "warning"
          });
          closeLoading();
          return;
        }

        if (mode === "create") {
          await createCommunityQa({
            title,
            categoryId,
            contentBlocks: blocks,
            isEnabled: model.isEnabled
          });
          done();
          queryState.page = 1;
          fetchList();
          return;
        }

        if (!row?.communityQaId) {
          message("QA信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateCommunityQa({
          communityQaId: row.communityQaId,
          title,
          categoryId,
          contentBlocks: blocks,
          isEnabled: model.isEnabled
        });
        done();
        fetchList();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: CommunityQaItem): Promise<void> {
  try {
    await deleteCommunityQa({ communityQaId: row.communityQaId });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchList();
  } catch {}
}

onMounted(() => {
  fetchCategoryOptions().finally(() => {
    fetchList();
  });
});
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="标题关键词"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="queryState.categoryId"
            clearable
            filterable
            :loading="categoryOptionsLoading"
            class="w-[260px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="c in categoryOptions"
              :key="c.communityQaCategoryId"
              :label="`${c.name}（${c.communityQaCategoryId}）`"
              :value="c.communityQaCategoryId"
            />
          </el-select>
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

    <PureTableBar class="mt-2" title="社区QA" @refresh="fetchList">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openQaDialog('create')"
            >新增QA</el-button
          >
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="communityQaId"
        class="w-full"
      >
        <el-table-column prop="communityQaId" label="QAID" min-width="160" />
        <el-table-column
          prop="title"
          label="标题"
          min-width="260"
          show-overflow-tooltip
        />
        <el-table-column label="分类" min-width="180">
          <template #default="{ row }">
            <div class="flex items-center gap-2">
              <span
                class="inline-block h-3 w-3 rounded border"
                :style="{
                  backgroundColor: row.categoryColor || 'transparent',
                  borderColor: 'var(--el-border-color)'
                }"
              />
              <span>{{ row.categoryName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          prop="viewCount"
          label="浏览"
          width="90"
          align="right"
        />
        <el-table-column
          prop="usefulCount"
          label="有用"
          width="90"
          align="right"
        />
        <el-table-column
          prop="uselessCount"
          label="没用"
          width="90"
          align="right"
        />
        <el-table-column
          prop="watchCount"
          label="关注"
          width="90"
          align="right"
        />
        <el-table-column prop="isEnabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openQaDialog('edit', row)">
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该QA？"
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
