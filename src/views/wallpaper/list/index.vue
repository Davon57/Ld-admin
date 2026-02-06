<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import { message } from "@/utils/message";

defineOptions({
  name: "WallpaperList"
});

type WallpaperCategoryOption = {
  categoryId: string;
  name: string;
};

type WallpaperItem = {
  wallpaperId: string;
  title: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  width: number;
  height: number;
  sizeKb: number;
  tags: string[];
  isEnabled: boolean;
  createdAt: string;
};

type EnabledFilter = "" | boolean;

const route = useRoute();
const router = useRouter();

const categories = ref<WallpaperCategoryOption[]>([
  { categoryId: "WP_CAT_001", name: "简约" },
  { categoryId: "WP_CAT_002", name: "自然" },
  { categoryId: "WP_CAT_003", name: "科技" }
]);

function categoryNameOf(categoryId: string): string {
  return (
    categories.value.find(v => v.categoryId === categoryId)?.name ?? categoryId
  );
}

const allWallpapers = ref<WallpaperItem[]>([
  {
    wallpaperId: "WP_0001",
    title: "雾色山谷",
    categoryId: "WP_CAT_002",
    categoryName: "自然",
    imageUrl: "https://picsum.photos/seed/wp_0001/800/450",
    width: 800,
    height: 450,
    sizeKb: 620,
    tags: ["自然", "清新"],
    isEnabled: true,
    createdAt: "2026-02-01 12:00:00"
  },
  {
    wallpaperId: "WP_0002",
    title: "极简几何",
    categoryId: "WP_CAT_001",
    categoryName: "简约",
    imageUrl: "https://picsum.photos/seed/wp_0002/800/450",
    width: 800,
    height: 450,
    sizeKb: 540,
    tags: ["简约", "几何"],
    isEnabled: true,
    createdAt: "2026-02-02 09:30:00"
  },
  {
    wallpaperId: "WP_0003",
    title: "霓虹电路",
    categoryId: "WP_CAT_003",
    categoryName: "科技",
    imageUrl: "https://picsum.photos/seed/wp_0003/800/450",
    width: 800,
    height: 450,
    sizeKb: 710,
    tags: ["科技", "赛博"],
    isEnabled: false,
    createdAt: "2026-01-28 21:05:00"
  },
  {
    wallpaperId: "WP_0004",
    title: "留白光影",
    categoryId: "WP_CAT_001",
    categoryName: "简约",
    imageUrl: "https://picsum.photos/seed/wp_0004/800/450",
    width: 800,
    height: 450,
    sizeKb: 488,
    tags: ["简约"],
    isEnabled: true,
    createdAt: "2026-02-03 14:10:00"
  },
  {
    wallpaperId: "WP_0005",
    title: "森林微光",
    categoryId: "WP_CAT_002",
    categoryName: "自然",
    imageUrl: "https://picsum.photos/seed/wp_0005/800/450",
    width: 800,
    height: 450,
    sizeKb: 805,
    tags: ["自然", "森林"],
    isEnabled: true,
    createdAt: "2026-02-05 08:20:00"
  }
]);

const queryState = reactive<{
  page: number;
  pageSize: number;
  keyword: string;
  categoryId: string;
  isEnabled: EnabledFilter;
}>({
  page: 1,
  pageSize: 10,
  keyword: "",
  categoryId: "",
  isEnabled: ""
});

const enabledOptions: Array<{ label: string; value: boolean }> = [
  { label: "启用", value: true },
  { label: "禁用", value: false }
];

onMounted(() => {
  const cid = route.query.categoryId;
  if (typeof cid === "string" && cid.trim()) {
    queryState.categoryId = cid.trim();
  }
});

const filteredList = computed((): WallpaperItem[] => {
  const kw = queryState.keyword.trim().toLowerCase();
  const cid = queryState.categoryId.trim();
  return allWallpapers.value
    .map(item => {
      if (item.categoryName !== categoryNameOf(item.categoryId)) {
        return { ...item, categoryName: categoryNameOf(item.categoryId) };
      }
      return item;
    })
    .filter(item => {
      if (cid && item.categoryId !== cid) return false;
      if (
        queryState.isEnabled !== "" &&
        item.isEnabled !== queryState.isEnabled
      ) {
        return false;
      }
      if (!kw) return true;
      return (
        item.wallpaperId.toLowerCase().includes(kw) ||
        item.title.toLowerCase().includes(kw) ||
        item.categoryName.toLowerCase().includes(kw) ||
        item.tags.some(t => t.toLowerCase().includes(kw))
      );
    });
});

const total = computed((): number => filteredList.value.length);

const tableData = computed((): WallpaperItem[] => {
  const start = (queryState.page - 1) * queryState.pageSize;
  const end = start + queryState.pageSize;
  return filteredList.value.slice(start, end);
});

function onSearch(): void {
  queryState.page = 1;
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.categoryId = "";
  queryState.isEnabled = "";
  router.replace({ path: "/wallpaper/list", query: {} });
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
}

function onCurrentChange(page: number): void {
  queryState.page = page;
}

const previewVisible = ref(false);
const previewItem = ref<WallpaperItem | null>(null);

function openPreview(row: WallpaperItem): void {
  previewItem.value = row;
  previewVisible.value = true;
}

function onToggleEnabled(row: WallpaperItem): void {
  const idx = allWallpapers.value.findIndex(
    v => v.wallpaperId === row.wallpaperId
  );
  if (idx < 0) return;
  const next = !allWallpapers.value[idx].isEnabled;
  allWallpapers.value.splice(idx, 1, {
    ...allWallpapers.value[idx],
    isEnabled: next
  });
  message(next ? "已启用" : "已禁用", { type: "success" });
}

function onDeleteRow(row: WallpaperItem): void {
  const idx = allWallpapers.value.findIndex(
    v => v.wallpaperId === row.wallpaperId
  );
  if (idx < 0) return;
  allWallpapers.value.splice(idx, 1);
  message("已删除壁纸", { type: "success" });
  const maxPage = Math.max(1, Math.ceil(total.value / queryState.pageSize));
  if (queryState.page > maxPage) queryState.page = maxPage;
}

function formatResolution(row: WallpaperItem): string {
  return `${row.width}×${row.height}`;
}
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            clearable
            placeholder="ID/标题/标签"
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="分类">
          <el-select
            v-model="queryState.categoryId"
            clearable
            class="w-[180px]!"
            @change="onSearch"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="c in categories"
              :key="c.categoryId"
              :label="c.name"
              :value="c.categoryId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
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

    <PureTableBar class="mt-2" title="壁纸列表" @refresh="onSearch">
      <el-table :data="tableData" row-key="wallpaperId" class="w-full">
        <el-table-column prop="wallpaperId" label="壁纸ID" min-width="140" />
        <el-table-column label="预览" width="120">
          <template #default="{ row }">
            <el-image
              :src="row.imageUrl"
              fit="cover"
              :preview-src-list="[row.imageUrl]"
              preview-teleported
              class="h-[52px] w-[92px] rounded"
            />
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="categoryName" label="分类" width="120" />
        <el-table-column label="分辨率" width="120">
          <template #default="{ row }">{{ formatResolution(row) }}</template>
        </el-table-column>
        <el-table-column
          prop="sizeKb"
          label="大小(KB)"
          width="110"
          align="right"
        />
        <el-table-column label="标签" min-width="220">
          <template #default="{ row }">
            <el-space wrap>
              <el-tag v-for="t in row.tags" :key="t" effect="plain" type="info">
                {{ t }}
              </el-tag>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="260">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openPreview(row)"
                >预览</el-button
              >
              <el-button
                link
                :type="row.isEnabled ? 'warning' : 'success'"
                @click="onToggleEnabled(row)"
              >
                {{ row.isEnabled ? "禁用" : "启用" }}
              </el-button>
              <el-popconfirm
                title="确认删除该壁纸？"
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

    <el-dialog
      v-model="previewVisible"
      title="壁纸预览"
      width="860px"
      destroy-on-close
    >
      <div v-if="previewItem" class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-[14px] font-medium text-gray-900">
              {{ previewItem.title }}
            </div>
            <div class="mt-1 text-[12px] text-gray-500">
              {{ previewItem.wallpaperId }} · {{ previewItem.categoryName }} ·
              {{ formatResolution(previewItem) }} · {{ previewItem.sizeKb }}KB
            </div>
          </div>
          <el-tag
            :type="previewItem.isEnabled ? 'success' : 'info'"
            effect="plain"
          >
            {{ previewItem.isEnabled ? "启用" : "禁用" }}
          </el-tag>
        </div>

        <el-image
          :src="previewItem.imageUrl"
          fit="contain"
          :preview-src-list="[previewItem.imageUrl]"
          preview-teleported
          class="w-full rounded border"
          style="height: 420px"
        />
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
