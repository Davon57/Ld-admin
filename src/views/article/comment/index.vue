<script setup lang="tsx">
import { reactive, ref, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  type ArticleCommentItem,
  type ArticleCommentListParams,
  getArticleCommentList
} from "@/api/article";

defineOptions({
  name: "ArticleComment"
});

const route = useRoute();

const queryState = reactive<
  Required<Pick<ArticleCommentListParams, "page" | "pageSize">> & {
    articleId: string;
    rootArticleCommentId: string;
  }
>({
  page: 1,
  pageSize: 10,
  articleId: "",
  rootArticleCommentId: ""
});

const loading = ref(false);
const tableData = ref<ArticleCommentItem[]>([]);
const total = ref(0);

const isRepliesMode = computed((): boolean => {
  return Boolean(queryState.rootArticleCommentId.trim());
});

function pickQueryString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

const listParams = computed((): ArticleCommentListParams | null => {
  const articleId = queryState.articleId.trim();
  if (!articleId) return null;

  const params: ArticleCommentListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize,
    articleId
  };

  const rootId = queryState.rootArticleCommentId.trim();
  if (rootId) params.rootArticleCommentId = rootId;

  return params;
});

async function fetchComments(): Promise<void> {
  const params = listParams.value;
  if (!params) {
    tableData.value = [];
    total.value = 0;
    return;
  }

  loading.value = true;
  try {
    const res = await getArticleCommentList(params);
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
  if (!queryState.articleId.trim()) {
    message("请输入文章ID", { type: "warning" });
    return;
  }
  queryState.page = 1;
  fetchComments();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.articleId = "";
  queryState.rootArticleCommentId = "";
  tableData.value = [];
  total.value = 0;
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchComments();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchComments();
}

function openReplies(row: ArticleCommentItem): void {
  if (!row.replyCount) return;
  queryState.rootArticleCommentId = row.articleCommentId;
  queryState.page = 1;
  fetchComments();
}

function backToRoots(): void {
  queryState.rootArticleCommentId = "";
  queryState.page = 1;
  fetchComments();
}

type ElTableColumnScope<Row> = { row: Row };

watch(
  () => [route.query.articleId, route.query.rootArticleCommentId] as const,
  ([articleIdQ, rootIdQ]) => {
    queryState.articleId = pickQueryString(articleIdQ);
    queryState.rootArticleCommentId = pickQueryString(rootIdQ);
    queryState.page = 1;
    fetchComments();
  },
  { immediate: true }
);
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="文章ID">
          <el-input
            v-model="queryState.articleId"
            placeholder="LD0001ABCD"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="根评论ID">
          <el-input
            v-model="queryState.rootArticleCommentId"
            placeholder="可选（不填查根评论）"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button @click="onReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <PureTableBar class="mt-2" title="评论列表" @refresh="fetchComments">
      <template #buttons>
        <el-space wrap>
          <el-button v-if="isRepliesMode" @click="backToRoots">
            返回根评论
          </el-button>
        </el-space>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="articleCommentId"
        class="w-full"
      >
        <el-table-column
          prop="articleCommentId"
          label="评论ID"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          prop="articleId"
          label="文章ID"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column
          prop="authorUserId"
          label="作者ID"
          min-width="160"
          show-overflow-tooltip
        />
        <el-table-column prop="nickname" label="昵称" min-width="140">
          <template #default="{ row }">
            {{ row.nickname || "-" }}
          </template>
        </el-table-column>
        <el-table-column
          prop="content"
          label="内容"
          min-width="320"
          show-overflow-tooltip
        />
        <el-table-column prop="likeCount" label="点赞" width="90" />
        <el-table-column label="回复" width="90">
          <template #default="{ row }">
            {{ isRepliesMode ? "-" : (row.replyCount ?? 0) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column prop="modifiedAt" label="修改时间" min-width="170">
          <template #default="{ row }">
            {{ row.modifiedAt || "-" }}
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="140">
          <template #default="scope: ElTableColumnScope<ArticleCommentItem>">
            <el-button
              v-if="!isRepliesMode"
              link
              type="primary"
              :disabled="!scope.row.replyCount"
              @click="openReplies(scope.row)"
            >
              查看回复
            </el-button>
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
