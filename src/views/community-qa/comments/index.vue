<script setup lang="tsx">
import { reactive, ref, computed, onMounted } from "vue";
import { PureTableBar } from "@/components/RePureTableBar";
import { DEFAULT_PAGE_SIZES } from "@/utils/table";
import {
  type QaCommentItem,
  type QaCommentListParams,
  getQaCommentList
} from "@/api/communityQa";

defineOptions({
  name: "CommunityQaComments"
});

const queryState = reactive<
  Required<Pick<QaCommentListParams, "page" | "pageSize">> & {
    qaAnswerId: string;
  }
>({
  page: 1,
  pageSize: 10,
  qaAnswerId: ""
});

const loading = ref(false);
const tableData = ref<QaCommentItem[]>([]);
const total = ref(0);

const listParams = computed((): QaCommentListParams => {
  const params: QaCommentListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const qaAnswerId = queryState.qaAnswerId.trim();
  if (qaAnswerId) params.qaAnswerId = qaAnswerId;
  return params;
});

async function fetchComments(): Promise<void> {
  loading.value = true;
  try {
    const res = await getQaCommentList(listParams.value);
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
  fetchComments();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.qaAnswerId = "";
  fetchComments();
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

onMounted(() => {
  fetchComments();
});
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="回答ID">
          <el-input
            v-model="queryState.qaAnswerId"
            placeholder="LD0009WXYZ"
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

    <PureTableBar class="mt-2" title="问答评论" @refresh="fetchComments">
      <el-table
        :data="tableData"
        :loading="loading"
        row-key="qaCommentId"
        class="w-full"
      >
        <el-table-column prop="qaCommentId" label="评论ID" min-width="140" />
        <el-table-column prop="qaAnswerId" label="回答ID" min-width="140" />
        <el-table-column
          prop="authorUserId"
          label="作者用户ID"
          min-width="140"
        />
        <el-table-column prop="nickname" label="作者昵称" min-width="120" />
        <el-table-column
          prop="content"
          label="内容"
          min-width="320"
          show-overflow-tooltip
        />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
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
