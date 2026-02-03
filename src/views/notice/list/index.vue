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
  type CommunityAnnouncement,
  type CommunityAnnouncementListParams,
  type CommunityAnnouncementTag,
  type CommunityAnnouncementContentBlock,
  type CommunityAnnouncementTagListResult,
  getCommunityAnnouncementList,
  createCommunityAnnouncement,
  updateCommunityAnnouncement,
  deleteCommunityAnnouncement,
  getCommunityAnnouncementTagList
} from "@/api/communityAnnouncement";

defineOptions({
  name: "NoticeList"
});

const queryState = reactive<
  Required<Pick<CommunityAnnouncementListParams, "page" | "pageSize">> & {
    keyword: string;
    communityAnnouncementTagId: "" | string;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  communityAnnouncementTagId: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<CommunityAnnouncement[]>([]);
const total = ref(0);

const tagOptionsLoading = ref(false);
const tagOptions = ref<CommunityAnnouncementTag[]>([]);

const listParams = computed((): CommunityAnnouncementListParams => {
  const params: CommunityAnnouncementListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.communityAnnouncementTagId !== "") {
    params.communityAnnouncementTagId = queryState.communityAnnouncementTagId;
  }
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchTagOptions(): Promise<void> {
  tagOptionsLoading.value = true;
  try {
    const res: CommunityAnnouncementTagListResult =
      await getCommunityAnnouncementTagList({ page: 1, pageSize: 1000 });
    tagOptions.value = res.list;
  } catch {
    tagOptions.value = [];
  } finally {
    tagOptionsLoading.value = false;
  }
}

async function fetchList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCommunityAnnouncementList(listParams.value);
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
  queryState.communityAnnouncementTagId = "";
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

type AnnouncementFormMode = "create" | "edit";

type AnnouncementFormModel = {
  title: string;
  summary: string;
  tagIds: string[];
  seq: number;
  isEnabled: boolean;
  publishedAt: Date | null;
  contentBlocks: CommunityAnnouncementContentBlock[];
};

const announcementFormRules: FormRules<AnnouncementFormModel> = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }]
};

function normalizeBlocks(
  input: CommunityAnnouncementContentBlock[]
): CommunityAnnouncementContentBlock[] {
  const out: CommunityAnnouncementContentBlock[] = [];
  const blocks = Array.isArray(input) ? input : [];
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const title = (b?.title ?? "").trim();
    const content = (b?.content ?? "").trim();
    if (!title && !content) continue;
    if (!title || !content) return [];
    out.push({ title, content, seq: out.length });
    if (out.length >= 200) break;
  }
  return out;
}

function openAnnouncementDialog(
  mode: AnnouncementFormMode,
  row?: CommunityAnnouncement
): void {
  const formRef = ref<FormInstance>();
  const model = reactive<AnnouncementFormModel>({
    title: mode === "edit" ? (row?.title ?? "") : "",
    summary: mode === "edit" ? (row?.summary ?? "") : "",
    tagIds: mode === "edit" ? (row?.tagIds ?? []) : [],
    seq: mode === "edit" ? (row?.seq ?? 0) : 0,
    isEnabled: mode === "edit" ? Boolean(row?.isEnabled) : true,
    publishedAt: null,
    contentBlocks:
      mode === "edit" && Array.isArray(row?.contentBlocks)
        ? row!.contentBlocks.map(b => ({
            title: b.title ?? "",
            content: b.content ?? "",
            seq: typeof b.seq === "number" ? b.seq : 0
          }))
        : []
  });

  const FormDialog = defineComponent({
    name: "NoticeAnnouncementFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      const syncSeq = () => {
        model.contentBlocks.forEach((b, index) => {
          b.seq = index;
        });
      };

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
            rules={announcementFormRules}
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
            <el-form-item label="摘要">
              <el-input
                v-model={model.summary}
                type="textarea"
                autosize={{ minRows: 2, maxRows: 4 }}
                maxlength={5000}
                show-word-limit
                placeholder="可选"
              />
            </el-form-item>
            <el-form-item label="标签">
              <el-select
                v-model={model.tagIds}
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                loading={tagOptionsLoading.value}
                class="w-full"
                placeholder="可选"
              >
                {tagOptions.value.map(t => (
                  <el-option
                    key={t.communityAnnouncementTagId}
                    label={`${t.name}（${t.communityAnnouncementTagId}）`}
                    value={t.communityAnnouncementTagId}
                  />
                ))}
              </el-select>
            </el-form-item>
            <el-form-item label="排序号">
              <el-input-number v-model={model.seq} min={0} class="w-full" />
            </el-form-item>
            <el-form-item label="启用">
              <el-switch v-model={model.isEnabled} />
            </el-form-item>
            <el-form-item label="发布时间">
              <el-date-picker
                v-model={model.publishedAt}
                type="datetime"
                class="w-full"
                clearable
                placeholder="可选"
              />
            </el-form-item>
          </el-form>

          <el-card shadow="never">
            <div class="flex items-center justify-between">
              <div class="text-[14px]">内容块</div>
              <el-button type="primary" plain onClick={addBlock}>
                新增内容块
              </el-button>
            </div>

            <div class="mt-3 space-y-3">
              {model.contentBlocks.length === 0 ? (
                <div class="text-[13px] text-[var(--el-text-color-secondary)]">
                  暂无内容块
                </div>
              ) : (
                model.contentBlocks.map((b, index) => (
                  <el-card key={index} shadow="never">
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-[13px]">第 {index + 1} 段</div>
                      <el-space>
                        <el-button
                          size="small"
                          disabled={index === 0}
                          onClick={() => moveBlock(index, index - 1)}
                        >
                          上移
                        </el-button>
                        <el-button
                          size="small"
                          disabled={index === model.contentBlocks.length - 1}
                          onClick={() => moveBlock(index, index + 1)}
                        >
                          下移
                        </el-button>
                        <el-button
                          size="small"
                          type="danger"
                          plain
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
                        autosize={{ minRows: 3, maxRows: 10 }}
                        maxlength={20000}
                        show-word-limit
                        placeholder="正文"
                      />
                    </div>
                  </el-card>
                ))
              )}
            </div>
          </el-card>
        </div>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增公告" : "编辑公告",
    width: "860px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(FormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const normalizedBlocks = normalizeBlocks(model.contentBlocks);
        const hasPartial = model.contentBlocks.some(b => {
          const title = (b?.title ?? "").trim();
          const content = (b?.content ?? "").trim();
          return Boolean(title) !== Boolean(content);
        });
        if (hasPartial) {
          message("内容块需同时填写小标题和正文", { type: "warning" });
          closeLoading();
          return;
        }

        const payload = {
          title: model.title.trim(),
          summary: model.summary.trim(),
          tagIds: model.tagIds,
          contentBlocks: normalizedBlocks,
          seq: model.seq,
          isEnabled: model.isEnabled,
          publishedAt: model.publishedAt
            ? model.publishedAt.toISOString()
            : undefined
        };

        if (mode === "create") {
          await createCommunityAnnouncement(payload);
          done();
          queryState.page = 1;
          fetchList();
          return;
        }

        if (!row?.communityAnnouncementId) {
          message("公告信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateCommunityAnnouncement({
          communityAnnouncementId: row.communityAnnouncementId,
          ...payload
        });
        done();
        fetchList();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: CommunityAnnouncement): Promise<void> {
  try {
    await deleteCommunityAnnouncement({
      communityAnnouncementId: row.communityAnnouncementId
    });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchList();
  } catch {
    void 0;
  }
}

function renderTags(row: CommunityAnnouncement): string {
  const tags = Array.isArray(row.tags) ? row.tags : [];
  if (tags.length === 0) return "-";
  return tags
    .map(t => t.name)
    .filter(v => typeof v === "string" && v.trim())
    .join("，");
}

onMounted(() => {
  fetchTagOptions();
  fetchList();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="标题/摘要"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="queryState.communityAnnouncementTagId"
            clearable
            filterable
            :loading="tagOptionsLoading"
            class="w-[260px]!"
            placeholder="全部"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="t in tagOptions"
              :key="t.communityAnnouncementTagId"
              :label="`${t.name}（${t.communityAnnouncementTagId}）`"
              :value="t.communityAnnouncementTagId"
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

    <PureTableBar class="mt-2" title="公告列表" @refresh="fetchList">
      <template #buttons>
        <el-button type="primary" @click="openAnnouncementDialog('create')">
          新增公告
        </el-button>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="communityAnnouncementId"
        class="w-full"
      >
        <el-table-column
          prop="communityAnnouncementId"
          label="公告ID"
          min-width="160"
        />
        <el-table-column
          prop="title"
          label="标题"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column
          prop="summary"
          label="摘要"
          min-width="240"
          show-overflow-tooltip
        />
        <el-table-column label="标签" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ renderTags(row) }}
          </template>
        </el-table-column>
        <el-table-column prop="seq" label="排序" width="90" />
        <el-table-column prop="isEnabled" label="启用" width="90">
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
              <el-button
                link
                type="primary"
                @click="openAnnouncementDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该公告？"
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

      <div class="flex justify-end mt-4">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-size="queryState.pageSize"
          :current-page="queryState.page"
          :page-sizes="DEFAULT_PAGE_SIZES"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
