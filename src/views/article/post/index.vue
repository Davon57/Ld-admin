<script setup lang="tsx">
import { h, reactive, ref, computed, nextTick, defineComponent } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import {
  type Status,
  type TagItem,
  type TagListParams,
  type PostItem,
  type PostListParams,
  getTagList,
  getPostList,
  createPost,
  updatePost,
  deletePost,
  batchDeletePosts
} from "@/api/article";

defineOptions({
  name: "ArticlePost"
});

type StatusOption = { label: string; value: Status };
const statusOptions: StatusOption[] = [
  { label: "启用", value: 1 },
  { label: "禁用", value: 0 }
];

const queryState = reactive<
  Required<Pick<PostListParams, "page" | "pageSize">> & {
    keyword: string;
    status: "" | Status;
    tagId: "" | number;
  }
>({
  page: 1,
  pageSize: 10,
  keyword: "",
  status: "",
  tagId: ""
});

const loading = ref(false);
const tableData = ref<PostItem[]>([]);
const total = ref(0);
const selectionIds = ref<number[]>([]);

const tagOptionsLoading = ref(false);
const tagOptions = ref<TagItem[]>([]);

const tagNameMap = computed((): Map<number, string> => {
  return new Map(tagOptions.value.map(t => [t.id, t.name]));
});

const listParams = computed((): PostListParams => {
  const params: PostListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.status !== "") params.status = queryState.status;
  if (queryState.tagId !== "") params.tagId = queryState.tagId;
  return params;
});

async function fetchTagOptions(): Promise<void> {
  tagOptionsLoading.value = true;
  try {
    const params: TagListParams = {
      page: 1,
      pageSize: 200,
      status: 1
    };
    const res = await getTagList(params);
    if (!res.success) {
      message(res.message || "获取标签失败", { type: "error" });
      tagOptions.value = [];
      return;
    }
    tagOptions.value = res.data.list;
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  } finally {
    tagOptionsLoading.value = false;
  }
}

async function fetchPosts(): Promise<void> {
  loading.value = true;
  try {
    const res = await getPostList(listParams.value);
    if (!res.success) {
      message(res.message || "获取文章列表失败", { type: "error" });
      tableData.value = [];
      total.value = 0;
      return;
    }
    tableData.value = res.data.list;
    total.value = res.data.total;
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchPosts();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.status = "";
  queryState.tagId = "";
  fetchPosts();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchPosts();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchPosts();
}

function onSelectionChange(rows: PostItem[]): void {
  selectionIds.value = rows.map(r => r.id);
}

type PostFormMode = "create" | "edit";

type PostFormModel = {
  id?: number;
  title: string;
  author: string;
  status: Status;
  tags: number[];
  content: string;
};

const postFormRules: FormRules<PostFormModel> = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  author: [{ required: true, message: "请输入作者", trigger: "blur" }],
  tags: [
    {
      validator: (_rule, value: number[], callback) => {
        return Array.isArray(value) && value.length > 0
          ? callback()
          : callback(new Error("请选择至少一个标签"));
      },
      trigger: "change"
    }
  ],
  content: [{ required: true, message: "请输入正文", trigger: "blur" }],
  status: [{ required: true, message: "请选择状态", trigger: "change" }]
};

function openPostDialog(mode: PostFormMode, row?: PostItem): void {
  const formRef = ref<FormInstance>();
  const model = reactive<PostFormModel>({
    id: mode === "edit" ? row?.id : undefined,
    title: mode === "edit" ? (row?.title ?? "") : "",
    author: mode === "edit" ? (row?.author ?? "") : "",
    status: mode === "edit" ? (row?.status ?? 1) : 1,
    tags: mode === "edit" ? (row?.tags ?? []) : [],
    content: mode === "edit" ? (row?.content ?? "") : ""
  });

  const PostFormDialog = defineComponent({
    name: "PostFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={postFormRules}
          label-width="90px"
        >
          <el-form-item label="标题" prop="title">
            <el-input
              v-model={model.title}
              placeholder="请输入标题"
              clearable
            />
          </el-form-item>
          <el-form-item label="作者" prop="author">
            <el-input
              v-model={model.author}
              placeholder="请输入作者"
              clearable
            />
          </el-form-item>
          <el-form-item label="标签" prop="tags">
            <el-select
              v-model={model.tags}
              multiple
              filterable
              clearable
              loading={tagOptionsLoading.value}
              class="w-full"
              placeholder="请选择标签"
            >
              {tagOptions.value.map(t => (
                <el-option key={t.id} label={t.name} value={t.id} />
              ))}
            </el-select>
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-segmented
              v-model={model.status}
              options={statusOptions.map(s => ({
                label: s.label,
                value: s.value
              }))}
            />
          </el-form-item>
          <el-form-item label="正文" prop="content">
            <el-input
              v-model={model.content}
              type="textarea"
              rows={8}
              placeholder="请输入正文内容"
              resize="vertical"
            />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增文章" : "编辑文章",
    width: "720px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(PostFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        if (mode === "create") {
          const res = await createPost({
            title: model.title.trim(),
            author: model.author.trim(),
            status: model.status,
            tags: [...model.tags],
            content: model.content.trim()
          });
          if (!res.success) {
            message(res.message || "新增失败", { type: "error" });
            closeLoading();
            return;
          }
          message("新增成功", { type: "success" });
          done();
          queryState.page = 1;
          fetchPosts();
          return;
        }

        if (!model.id) {
          message("文章信息异常", { type: "error" });
          closeLoading();
          return;
        }

        const res = await updatePost({
          id: model.id,
          title: model.title.trim(),
          author: model.author.trim(),
          status: model.status,
          tags: [...model.tags],
          content: model.content.trim()
        });
        if (!res.success) {
          message(res.message || "更新失败", { type: "error" });
          closeLoading();
          return;
        }
        message("更新成功", { type: "success" });
        done();
        fetchPosts();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: PostItem): Promise<void> {
  try {
    const res = await deletePost({ id: row.id });
    if (!res.success) {
      message(res.message || "删除失败", { type: "error" });
      return;
    }
    message("删除成功", { type: "success" });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchPosts();
  } catch {
    message("网络异常，请稍后重试", { type: "error" });
  }
}

async function onBatchDelete(): Promise<void> {
  if (selectionIds.value.length === 0) {
    message("请选择要删除的文章", { type: "warning" });
    return;
  }

  const deletingCount = selectionIds.value.length;
  const currentRows = tableData.value.length;

  const BatchDeleteContent = defineComponent({
    name: "BatchDeleteContent",
    setup() {
      return () => (
        <div class="text-[14px] leading-6">
          确认删除选中的 {deletingCount} 篇文章？
        </div>
      );
    }
  });

  addDialog({
    title: "批量删除",
    width: "420px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    contentRenderer: () => h(BatchDeleteContent),
    beforeSure: async (done, { closeLoading }) => {
      try {
        const ids = [...selectionIds.value];
        const res = await batchDeletePosts({ ids });
        if (!res.success) {
          message(res.message || "批量删除失败", { type: "error" });
          closeLoading();
          return;
        }
        message("删除成功", { type: "success" });
        done();
        if (queryState.page > 1 && deletingCount >= currentRows) {
          queryState.page -= 1;
        }
        selectionIds.value = [];
        fetchPosts();
      } catch {
        closeLoading();
        message("网络异常，请稍后重试", { type: "error" });
      }
    }
  });
}

fetchTagOptions();
fetchPosts();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="标题/作者/正文"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-select
            v-model="queryState.tagId"
            clearable
            filterable
            :loading="tagOptionsLoading"
            class="w-[180px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="t in tagOptions"
              :key="t.id"
              :label="t.name"
              :value="t.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryState.status" clearable class="w-[160px]!">
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="文章列表" @refresh="fetchPosts">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openPostDialog('create')">
            新增文章
          </el-button>
          <el-button type="danger" plain @click="onBatchDelete">
            批量删除
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="id"
        class="w-full"
        @selection-change="onSelectionChange"
      >
        <el-table-column type="selection" width="46" />
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="author" label="作者" width="120" />
        <el-table-column label="标签" min-width="220">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag
                v-for="tid in row.tags"
                :key="tid"
                size="small"
                type="info"
              >
                {{ tagNameMap.get(tid) || tid }}
              </el-tag>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="160">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openPostDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该文章？"
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
          :page-sizes="[10, 20, 50]"
          @size-change="onSizeChange"
          @current-change="onCurrentChange"
        />
      </div>
    </PureTableBar>
  </div>
</template>
