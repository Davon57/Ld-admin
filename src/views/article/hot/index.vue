<script setup lang="tsx">
import { computed, reactive, ref } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  type ArticleItem,
  type CategoryItem,
  type CategoryListParams,
  type HotArticleListParams,
  getCategoryList,
  getHotArticleList,
  unsetArticleHot
} from "@/api/article";

defineOptions({
  name: "ArticleHot"
});

type EnabledOption = { label: string; value: boolean };
const enabledOptions: EnabledOption[] = [
  { label: "启用", value: true },
  { label: "禁用", value: false }
];

const queryState = reactive<{
  page: number;
  pageSize: number;
  keyword: string;
  articleCategoryId: "" | string;
  isEnabled: "" | boolean;
}>({
  page: 1,
  pageSize: 10,
  keyword: "",
  articleCategoryId: "",
  isEnabled: ""
});

const loading = ref(false);
const rawList = ref<ArticleItem[]>([]);

const categoryOptionsLoading = ref(false);
const categoryOptions = ref<CategoryItem[]>([]);

const unhotingMap = ref<Map<string, boolean>>(new Map());

const categoryNameMap = computed((): Map<string, string> => {
  return new Map(categoryOptions.value.map(c => [c.articleCategoryId, c.name]));
});

function resolveCategoryName(id: string): string {
  return categoryNameMap.value.get(id) ?? id;
}

function setUnhoting(articleId: string, v: boolean): void {
  const next = new Map(unhotingMap.value);
  next.set(articleId, v);
  unhotingMap.value = next;
}

function isUnhoting(articleId: string): boolean {
  return unhotingMap.value.get(articleId) ?? false;
}

const sortedList = computed((): ArticleItem[] => {
  return [...rawList.value].sort((a, b) => {
    const diff = (b.viewCount ?? 0) - (a.viewCount ?? 0);
    if (diff !== 0) return diff;
    return String(b.publishedAt ?? "").localeCompare(
      String(a.publishedAt ?? "")
    );
  });
});

const total = computed((): number => sortedList.value.length);

const pagedList = computed((): ArticleItem[] => {
  const start = (queryState.page - 1) * queryState.pageSize;
  const end = start + queryState.pageSize;
  return sortedList.value.slice(start, end);
});

function getRank(indexInPage: number): number {
  return (queryState.page - 1) * queryState.pageSize + indexInPage + 1;
}

const fetchParams = computed((): HotArticleListParams => {
  const params: HotArticleListParams = {
    page: 1,
    pageSize: 1000
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.articleCategoryId !== "") {
    params.articleCategoryId = queryState.articleCategoryId;
  }
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  return params;
});

async function fetchCategoryOptions(): Promise<void> {
  categoryOptionsLoading.value = true;
  try {
    const params: CategoryListParams = {
      page: 1,
      pageSize: 200,
      isEnabled: true
    };
    const res = await getCategoryList(params);
    categoryOptions.value = res.list;
  } catch {
    categoryOptions.value = [];
  } finally {
    categoryOptionsLoading.value = false;
  }
}

async function fetchHotList(): Promise<void> {
  loading.value = true;
  try {
    const res = await getHotArticleList(fetchParams.value);
    rawList.value = res.list;
    if (queryState.page > 1 && pagedList.value.length === 0) {
      queryState.page = 1;
    }
  } catch {
    rawList.value = [];
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchHotList();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.articleCategoryId = "";
  queryState.isEnabled = "";
  fetchHotList();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
}

function onCurrentChange(page: number): void {
  queryState.page = page;
}

async function onUnhot(row: ArticleItem): Promise<void> {
  const articleId = row.articleId;
  if (!articleId) return;

  setUnhoting(articleId, true);
  try {
    await unsetArticleHot({ articleId });
    message("已取消热门", { type: "success" });
    rawList.value = rawList.value.filter(a => a.articleId !== articleId);
    if (queryState.page > 1 && pagedList.value.length === 0) {
      queryState.page -= 1;
    }
  } catch {
    message("取消热门失败", { type: "error" });
  } finally {
    setUnhoting(articleId, false);
  }
}

fetchCategoryOptions();
fetchHotList();
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
            v-model="queryState.articleCategoryId"
            clearable
            filterable
            :loading="categoryOptionsLoading"
            class="w-[180px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="c in categoryOptions"
              :key="c.articleCategoryId"
              :label="c.name"
              :value="c.articleCategoryId"
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
            <el-option
              v-for="opt in enabledOptions"
              :key="String(opt.value)"
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

    <PureTableBar class="mt-2" title="热门文章榜" @refresh="fetchHotList">
      <el-table
        :data="pagedList"
        :loading="loading"
        row-key="articleId"
        class="w-full"
      >
        <el-table-column label="排名" width="90" align="center">
          <template #default="{ $index }">
            <div
              class="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[12px] font-semibold text-gray-700"
            >
              {{ getRank($index) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="articleId" label="文章ID" min-width="150" />
        <el-table-column
          prop="title"
          label="标题"
          min-width="260"
          show-overflow-tooltip
        />
        <el-table-column
          prop="viewCount"
          label="浏览量"
          width="110"
          align="right"
        />
        <el-table-column
          prop="likeCount"
          label="点赞"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            {{ row.likeCount ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column
          prop="collectCount"
          label="收藏"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            {{ row.collectCount ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column
          prop="commentCount"
          label="评论"
          width="110"
          align="right"
        >
          <template #default="{ row }">
            {{ row.commentCount ?? 0 }}
          </template>
        </el-table-column>
        <el-table-column prop="articleCategoryId" label="分类" min-width="140">
          <template #default="{ row }">
            {{ resolveCategoryName(row.articleCategoryId) }}
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="120">
          <template #default="{ row }">
            <el-popconfirm
              title="确认取消该文章热门？"
              confirm-button-text="取消热门"
              confirm-button-type="danger"
              cancel-button-text="返回"
              @confirm="onUnhot(row)"
            >
              <template #reference>
                <el-button
                  link
                  type="danger"
                  :loading="isUnhoting(row.articleId)"
                >
                  取消热门
                </el-button>
              </template>
            </el-popconfirm>
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
