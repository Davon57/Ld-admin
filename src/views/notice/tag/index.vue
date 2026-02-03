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
  type CommunityAnnouncementTag,
  type CommunityAnnouncementTagListParams,
  getCommunityAnnouncementTagList,
  createCommunityAnnouncementTag,
  updateCommunityAnnouncementTag,
  deleteCommunityAnnouncementTag
} from "@/api/communityAnnouncement";

defineOptions({
  name: "NoticeTag"
});

const queryState = reactive<
  Required<Pick<CommunityAnnouncementTagListParams, "page" | "pageSize">> & {
    communityAnnouncementTagId: string;
    nameKeyword: string;
    isEnabled: "" | boolean;
  }
>({
  page: 1,
  pageSize: 10,
  communityAnnouncementTagId: "",
  nameKeyword: "",
  isEnabled: ""
});

const loading = ref(false);
const tableData = ref<CommunityAnnouncementTag[]>([]);
const total = ref(0);

const listParams = computed((): CommunityAnnouncementTagListParams => {
  const params: CommunityAnnouncementTagListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };

  const id = queryState.communityAnnouncementTagId.trim();
  if (id) params.communityAnnouncementTagId = id;

  const nameKeyword = queryState.nameKeyword.trim();
  if (nameKeyword) params.nameKeyword = nameKeyword;

  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;

  return params;
});

async function fetchTags(): Promise<void> {
  loading.value = true;
  try {
    const res = await getCommunityAnnouncementTagList(listParams.value);
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
  fetchTags();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.communityAnnouncementTagId = "";
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

type TagFormMode = "create" | "edit";

type TagFormModel = {
  name: string;
  description: string;
  seq: number;
  isEnabled: boolean;
};

const tagFormRules: FormRules<TagFormModel> = {
  name: [{ required: true, message: "请输入标签名称", trigger: "blur" }]
};

function openTagDialog(
  mode: TagFormMode,
  row?: CommunityAnnouncementTag
): void {
  const formRef = ref<FormInstance>();
  const model = reactive<TagFormModel>({
    name: mode === "edit" ? (row?.name ?? "") : "",
    description: mode === "edit" ? (row?.description ?? "") : "",
    seq: mode === "edit" ? (row?.seq ?? 0) : 0,
    isEnabled: mode === "edit" ? Boolean(row?.isEnabled) : true
  });

  const TagFormDialog = defineComponent({
    name: "NoticeTagFormDialog",
    setup() {
      nextTick(() => {
        formRef.value?.clearValidate();
      });

      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={tagFormRules}
          label-width="100px"
        >
          <el-form-item label="名称" prop="name">
            <el-input
              v-model={model.name}
              clearable
              maxlength={50}
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              v-model={model.description}
              type="textarea"
              autosize={{ minRows: 2, maxRows: 4 }}
              maxlength={5000}
              show-word-limit
              placeholder="可选"
            />
          </el-form-item>
          <el-form-item label="排序号">
            <el-input-number v-model={model.seq} min={0} class="w-full" />
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model={model.isEnabled} />
          </el-form-item>
        </el-form>
      );
    }
  });

  addDialog({
    title: mode === "create" ? "新增公告标签" : "编辑公告标签",
    width: "560px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    contentRenderer: () => h(TagFormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();
        const payload = {
          name: model.name.trim(),
          description: model.description.trim(),
          seq: model.seq,
          isEnabled: model.isEnabled
        };

        if (mode === "create") {
          await createCommunityAnnouncementTag(payload);
          done();
          queryState.page = 1;
          fetchTags();
          return;
        }

        if (!row?.communityAnnouncementTagId) {
          message("标签信息异常", { type: "error" });
          closeLoading();
          return;
        }

        await updateCommunityAnnouncementTag({
          communityAnnouncementTagId: row.communityAnnouncementTagId,
          ...payload
        });
        done();
        fetchTags();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onDeleteRow(row: CommunityAnnouncementTag): Promise<void> {
  try {
    await deleteCommunityAnnouncementTag({
      communityAnnouncementTagId: row.communityAnnouncementTagId
    });
    if (queryState.page > 1 && tableData.value.length === 1) {
      queryState.page -= 1;
    }
    fetchTags();
  } catch {
    void 0;
  }
}

onMounted(() => {
  fetchTags();
});
</script>

<template>
  <div class="p-4">
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="标签ID">
          <el-input
            v-model="queryState.communityAnnouncementTagId"
            placeholder="LD####AAAA"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.nameKeyword"
            placeholder="标签名"
            clearable
            class="w-[240px]!"
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

    <PureTableBar class="mt-2" title="公告标签" @refresh="fetchTags">
      <template #buttons>
        <el-button type="primary" @click="openTagDialog('create')">
          新增标签
        </el-button>
      </template>

      <el-table
        :data="tableData"
        :loading="loading"
        row-key="communityAnnouncementTagId"
        class="w-full"
      >
        <el-table-column
          prop="communityAnnouncementTagId"
          label="标签ID"
          min-width="160"
        />
        <el-table-column prop="name" label="名称" min-width="140" />
        <el-table-column
          prop="description"
          label="描述"
          min-width="220"
          show-overflow-tooltip
        />
        <el-table-column prop="seq" label="排序" width="90" />
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success">启用</el-tag>
            <el-tag v-else type="info">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
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
