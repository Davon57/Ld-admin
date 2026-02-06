<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { useRouter } from "vue-router";
import { PureTableBar } from "@/components/RePureTableBar";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import { message } from "@/utils/message";

defineOptions({
  name: "WallpaperCategory"
});

type WallpaperCategory = {
  categoryId: string;
  name: string;
  description: string;
  coverUrl: string;
  wallpaperCount: number;
  isEnabled: boolean;
  updatedAt: string;
};

type EnabledFilter = "" | boolean;

const router = useRouter();

const allCategories = ref<WallpaperCategory[]>([
  {
    categoryId: "WP_CAT_001",
    name: "简约",
    description: "极简风格壁纸，适合日常桌面与移动端",
    coverUrl: "https://picsum.photos/seed/wp_cat_001/200/120",
    wallpaperCount: 18,
    isEnabled: true,
    updatedAt: "2026-02-05 10:20:00"
  },
  {
    categoryId: "WP_CAT_002",
    name: "自然",
    description: "山川湖海与自然光影",
    coverUrl: "https://picsum.photos/seed/wp_cat_002/200/120",
    wallpaperCount: 27,
    isEnabled: true,
    updatedAt: "2026-02-03 18:12:00"
  },
  {
    categoryId: "WP_CAT_003",
    name: "科技",
    description: "赛博、科幻、抽象科技风",
    coverUrl: "https://picsum.photos/seed/wp_cat_003/200/120",
    wallpaperCount: 12,
    isEnabled: false,
    updatedAt: "2026-01-29 09:40:00"
  }
]);

const queryState = reactive<{
  page: number;
  pageSize: number;
  keyword: string;
  isEnabled: EnabledFilter;
}>({
  page: 1,
  pageSize: 10,
  keyword: "",
  isEnabled: ""
});

const enabledOptions: Array<{ label: string; value: boolean }> = [
  { label: "启用", value: true },
  { label: "禁用", value: false }
];

const filteredList = computed((): WallpaperCategory[] => {
  const kw = queryState.keyword.trim().toLowerCase();
  return allCategories.value.filter(item => {
    if (
      queryState.isEnabled !== "" &&
      item.isEnabled !== queryState.isEnabled
    ) {
      return false;
    }
    if (!kw) return true;
    return (
      item.categoryId.toLowerCase().includes(kw) ||
      item.name.toLowerCase().includes(kw) ||
      item.description.toLowerCase().includes(kw)
    );
  });
});

const total = computed((): number => filteredList.value.length);

const tableData = computed((): WallpaperCategory[] => {
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
  queryState.isEnabled = "";
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
}

function onCurrentChange(page: number): void {
  queryState.page = page;
}

function openWallpaperList(categoryId: string): void {
  router.push({ path: "/wallpaper/list", query: { categoryId } });
}

function nowYmdHms(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function createId(prefix: string): string {
  const t = Date.now().toString(36).toUpperCase();
  return `${prefix}_${t}`;
}

const dialogVisible = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const formRef = ref<FormInstance>();
const formModel = reactive<{
  categoryId: string;
  name: string;
  description: string;
  coverUrl: string;
  isEnabled: boolean;
}>({
  categoryId: "",
  name: "",
  description: "",
  coverUrl: "",
  isEnabled: true
});

const formRules: FormRules = {
  categoryId: [{ required: true, message: "请输入分类ID", trigger: "blur" }],
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }]
};

function openCategoryDialog(
  mode: "create" | "edit",
  row?: WallpaperCategory
): void {
  dialogMode.value = mode;
  if (mode === "create") {
    formModel.categoryId = createId("WP_CAT");
    formModel.name = "";
    formModel.description = "";
    formModel.coverUrl = "https://picsum.photos/seed/wp_cat_new/200/120";
    formModel.isEnabled = true;
  } else {
    if (!row) return;
    formModel.categoryId = row.categoryId;
    formModel.name = row.name;
    formModel.description = row.description;
    formModel.coverUrl = row.coverUrl;
    formModel.isEnabled = row.isEnabled;
  }
  dialogVisible.value = true;
}

async function onSubmitCategory(): Promise<void> {
  const form = formRef.value;
  if (!form) return;
  const ok = await form.validate().catch(() => false);
  if (!ok) return;

  const existsIndex = allCategories.value.findIndex(
    v => v.categoryId === formModel.categoryId
  );

  if (dialogMode.value === "create") {
    if (existsIndex >= 0) {
      message("分类ID已存在，请修改后再提交", { type: "warning" });
      return;
    }
    allCategories.value.unshift({
      categoryId: formModel.categoryId.trim(),
      name: formModel.name.trim(),
      description: formModel.description.trim(),
      coverUrl: formModel.coverUrl.trim(),
      wallpaperCount: 0,
      isEnabled: formModel.isEnabled,
      updatedAt: nowYmdHms()
    });
    message("已新增分类", { type: "success" });
  } else {
    if (existsIndex < 0) {
      message("分类不存在或已被删除", { type: "warning" });
      return;
    }
    const old = allCategories.value[existsIndex];
    allCategories.value.splice(existsIndex, 1, {
      ...old,
      name: formModel.name.trim(),
      description: formModel.description.trim(),
      coverUrl: formModel.coverUrl.trim(),
      isEnabled: formModel.isEnabled,
      updatedAt: nowYmdHms()
    });
    message("已更新分类", { type: "success" });
  }
  dialogVisible.value = false;
}

function onDeleteRow(row: WallpaperCategory): void {
  const idx = allCategories.value.findIndex(
    v => v.categoryId === row.categoryId
  );
  if (idx < 0) return;
  allCategories.value.splice(idx, 1);
  message("已删除分类", { type: "success" });
  const maxPage = Math.max(1, Math.ceil(total.value / queryState.pageSize));
  if (queryState.page > maxPage) queryState.page = maxPage;
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
            placeholder="分类ID/名称/描述"
            class="w-[260px]!"
            @keyup.enter="onSearch"
          />
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

    <PureTableBar class="mt-2" title="壁纸分类" @refresh="onSearch">
      <template #buttons>
        <el-button type="primary" @click="openCategoryDialog('create')">
          新增分类
        </el-button>
      </template>

      <el-table :data="tableData" row-key="categoryId" class="w-full">
        <el-table-column prop="categoryId" label="分类ID" min-width="160" />
        <el-table-column label="封面" width="120">
          <template #default="{ row }">
            <el-image
              :src="row.coverUrl"
              fit="cover"
              :preview-src-list="[row.coverUrl]"
              preview-teleported
              class="h-[52px] w-[92px] rounded"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column
          prop="description"
          label="描述"
          min-width="260"
          show-overflow-tooltip
        />
        <el-table-column
          prop="wallpaperCount"
          label="壁纸数"
          width="90"
          align="right"
        />
        <el-table-column prop="isEnabled" label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="240">
          <template #default="{ row }">
            <el-space>
              <el-button
                link
                type="primary"
                @click="openWallpaperList(row.categoryId)"
              >
                壁纸
              </el-button>
              <el-button
                link
                type="primary"
                @click="openCategoryDialog('edit', row)"
              >
                编辑
              </el-button>
              <el-popconfirm
                title="确认删除该分类？"
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
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增分类' : '编辑分类'"
      width="560px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formModel"
        :rules="formRules"
        label-width="90px"
      >
        <el-form-item label="分类ID" prop="categoryId">
          <el-input
            v-model="formModel.categoryId"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="formModel.name" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="formModel.description"
            type="textarea"
            :rows="4"
            resize="vertical"
          />
        </el-form-item>
        <el-form-item label="封面URL">
          <el-input v-model="formModel.coverUrl" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="formModel.isEnabled"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmitCategory">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>
