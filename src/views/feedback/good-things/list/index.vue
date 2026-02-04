<script setup lang="tsx">
import { computed, defineComponent, h, reactive, ref, watch } from "vue";
import { addDialog } from "@/components/ReDialog";
import { PureTableBar } from "@/components/RePureTableBar";
import { message } from "@/utils/message";
import { DEFAULT_PAGE_SIZES, isPageData } from "@/utils/table";
import { useUserStoreHook } from "@/store/modules/user";
import { compressImageToDataUrl, ensureImageDataUrl } from "@/utils/image";
import {
  type CreateGoodThingPayload,
  type GoodThingDetail,
  type GoodThingImage,
  type GoodThingItem,
  type GoodThingListParams,
  type GoodThingPublishType,
  createGoodThing,
  deleteGoodThing,
  getGoodThingDetail,
  getGoodThingList,
  recommendGoodThing,
  unrecommendGoodThing
} from "@/api/goodThing";
import type {
  FormInstance,
  FormRules,
  UploadProps,
  UploadUserFile
} from "element-plus";
import Plus from "~icons/ep/plus";

defineOptions({
  name: "FeedbackGoodThingList"
});

type QueryState = {
  page: number;
  pageSize: number;
  keyword: string;
  publishType: "" | GoodThingPublishType;
  isEnabled: "" | boolean;
  isRecommended: "" | boolean;
};

const queryState = reactive<QueryState>({
  page: 1,
  pageSize: 10,
  keyword: "",
  publishType: "",
  isEnabled: "",
  isRecommended: ""
});

const loading = ref(false);
const serverRows = ref<GoodThingItem[]>([]);
const total = ref(0);

const userStore = useUserStoreHook();
const canManageDisabled = computed(() => {
  const role = String(userStore.profile?.role ?? userStore.roles?.[0] ?? "");
  return role === "admin" || role === "moderator";
});

const publishTypeOptions = [
  { label: "买过", value: "bought" as const },
  { label: "自出", value: "self" as const }
];

function getPublishTypeText(type: string): string {
  if (type === "bought") return "买过";
  if (type === "self") return "自出";
  return "-";
}

const listParams = computed((): GoodThingListParams => {
  const params: GoodThingListParams = {
    page: queryState.page,
    pageSize: queryState.pageSize
  };
  const keyword = queryState.keyword.trim();
  if (keyword) params.keyword = keyword;
  if (queryState.publishType) params.publishType = queryState.publishType;
  if (queryState.isEnabled !== "") params.isEnabled = queryState.isEnabled;
  if (queryState.isRecommended !== "") {
    params.isRecommended = queryState.isRecommended;
  }
  return params;
});

async function fetchGoodThings(): Promise<void> {
  loading.value = true;
  try {
    const res = await getGoodThingList(listParams.value);
    if (isPageData<GoodThingItem>(res)) {
      serverRows.value = res.list;
      total.value = res.total;
      return;
    }
    serverRows.value = Array.isArray(res) ? res : [];
    total.value = serverRows.value.length;
  } catch {
    serverRows.value = [];
    total.value = 0;
    message("网络异常，请稍后重试", { type: "error" });
  } finally {
    loading.value = false;
  }
}

function onSearch(): void {
  queryState.page = 1;
  fetchGoodThings();
}

function onReset(): void {
  queryState.page = 1;
  queryState.pageSize = 10;
  queryState.keyword = "";
  queryState.publishType = "";
  queryState.isEnabled = "";
  queryState.isRecommended = "";
  fetchGoodThings();
}

function onSizeChange(size: number): void {
  queryState.pageSize = size;
  queryState.page = 1;
  fetchGoodThings();
}

function onCurrentChange(page: number): void {
  queryState.page = page;
  fetchGoodThings();
}

type HasGoodThingImages = { images?: Array<{ url: string }> };

function getPreviewImages(row: HasGoodThingImages): string[] {
  if (!row.images || !Array.isArray(row.images)) return [];
  return row.images.map(i => i.url).filter(Boolean);
}

function openDetailDialog(row: GoodThingItem): void {
  const detail = ref<GoodThingDetail | null>(null);
  const detailLoading = ref(false);

  async function load(): Promise<void> {
    detailLoading.value = true;
    try {
      detail.value = await getGoodThingDetail({ goodThingId: row.goodThingId });
    } catch {
      detail.value = null;
      message("加载详情失败", { type: "error" });
    } finally {
      detailLoading.value = false;
    }
  }

  const Detail = defineComponent({
    name: "GoodThingDetailDialog",
    setup() {
      void load();
      return () => {
        const d = detail.value;
        const images = d ? getPreviewImages(d) : [];

        const priceText =
          d && d.buyPrice != null && !Number.isNaN(Number(d.buyPrice))
            ? String(d.buyPrice)
            : "-";

        return (
          <div class="px-1">
            {detailLoading.value ? (
              <el-skeleton rows={6} animated />
            ) : d ? (
              <div class="space-y-4">
                <div class="text-[14px] font-medium">{d.title}</div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  <span>作者昵称：{d.authorUsername}</span>
                  <span class="ml-4">
                    类型：{getPublishTypeText(d.publishType)}
                  </span>
                  <span class="ml-4">价格：{priceText}</span>
                  <span class="ml-4">ID：{d.goodThingId}</span>
                </div>
                <div class="text-[12px] text-[var(--el-text-color-secondary)]">
                  <span>创建时间：{d.createdAt || "-"}</span>
                  <span class="ml-4">更新时间：{d.updatedAt || "-"}</span>
                </div>
                <div class="whitespace-pre-wrap break-words text-[13px] leading-6">
                  {d.description}
                </div>
                <div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {images.map(url => (
                    <el-image
                      key={url}
                      src={url}
                      fit="cover"
                      class="h-20 w-20 rounded"
                      previewSrcList={images}
                      previewTeleported
                    />
                  ))}
                </div>
              </div>
            ) : (
              <el-empty description="暂无数据" />
            )}
          </div>
        );
      };
    }
  });

  addDialog({
    title: "好物详情",
    width: "980px",
    fullscreenIcon: true,
    alignCenter: true,
    destroyOnClose: true,
    closeOnClickModal: false,
    hideFooter: true,
    contentRenderer: () => h(Detail)
  });
}

type GoodThingFormModel = {
  publishType: "" | GoodThingPublishType;
  title: string;
  images: GoodThingImage[];
  description: string;
  buyLinkOrCode: string;
  buyConfig: string;
  buyPrice: number | null;
  contactWechat: string;
  isEnabled: boolean;
};

function openCreateDialog(): void {
  const formRef = ref<FormInstance>();
  const model = reactive<GoodThingFormModel>({
    publishType: "",
    title: "",
    images: [],
    description: "",
    buyLinkOrCode: "",
    buyConfig: "",
    buyPrice: null,
    contactWechat: "",
    isEnabled: true
  });

  watch(
    () => model.publishType,
    next => {
      if (next === "bought") {
        model.contactWechat = "";
        return;
      }
      if (next === "self") {
        model.buyLinkOrCode = "";
        model.buyConfig = "";
      }
    }
  );

  const imagesFileList = computed((): UploadUserFile[] => {
    return model.images
      .map((img, index): UploadUserFile | null => {
        const url = ensureImageDataUrl(img.url);
        return url ? { name: `good-thing-${index + 1}`, url } : null;
      })
      .filter((v): v is UploadUserFile => v != null);
  });

  const onImagesChange: UploadProps["onChange"] = async uploadFile => {
    if (model.images.length >= 9) {
      message("最多上传 9 张图片", { type: "warning" });
      return;
    }
    const raw = uploadFile.raw;
    if (!(raw instanceof File)) return;
    try {
      const dataUrl = await compressImageToDataUrl(raw, {
        maxWidth: 1600,
        maxHeight: 1600,
        maxBytes: 350 * 1024,
        preferMimeTypes: ["image/webp", "image/png", "image/jpeg"]
      });
      const normalized = ensureImageDataUrl(dataUrl);
      if (!normalized) return;
      if (model.images.some(i => ensureImageDataUrl(i.url) === normalized)) {
        return;
      }
      model.images.push({ url: normalized });
    } catch {
      message("读取图片失败", { type: "error" });
    }
  };

  const onImagesRemove: UploadProps["onRemove"] = uploadFile => {
    const url = uploadFile.url;
    if (typeof url !== "string") return;
    const idx = model.images.findIndex(i => ensureImageDataUrl(i.url) === url);
    if (idx >= 0) model.images.splice(idx, 1);
  };

  const goodThingFormRules: FormRules<GoodThingFormModel> = {
    publishType: [{ required: true, message: "请选择类型", trigger: "change" }],
    title: [
      { required: true, message: "请输入标题", trigger: "blur" },
      { min: 1, max: 30, message: "标题长度需为 1~30", trigger: "blur" }
    ],
    images: [
      {
        validator: (_rule, value, callback) => {
          const list = Array.isArray(value) ? value : [];
          if (list.length < 1) {
            callback(new Error("请上传至少 1 张图片"));
            return;
          }
          if (list.length > 9) {
            callback(new Error("最多上传 9 张图片"));
            return;
          }
          callback();
        },
        trigger: "change"
      }
    ],
    description: [
      { required: true, message: "请输入描述", trigger: "blur" },
      { min: 10, max: 400, message: "描述长度需为 10~400", trigger: "blur" }
    ],
    buyLinkOrCode: [
      {
        validator: (_rule, value, callback) => {
          if (model.publishType !== "bought") {
            callback();
            return;
          }
          if (String(value ?? "").trim()) {
            callback();
            return;
          }
          callback(new Error("请输入购买链接/口令"));
        },
        trigger: "blur"
      }
    ],
    buyConfig: [{ max: 200, message: "购买配置最长 200 字", trigger: "blur" }],
    buyPrice: [
      {
        validator: (_rule, value, callback) => {
          if (model.publishType !== "bought" && model.publishType !== "self") {
            callback();
            return;
          }
          if (value == null || Number.isNaN(Number(value))) {
            callback(new Error("请输入购买价格"));
            return;
          }
          callback();
        },
        trigger: "change"
      }
    ],
    contactWechat: [
      {
        validator: (_rule, value, callback) => {
          if (model.publishType !== "self") {
            callback();
            return;
          }
          const v = String(value ?? "").trim();
          if (!v) {
            callback(new Error("请输入微信号"));
            return;
          }
          if (v.length > 100) {
            callback(new Error("微信号最长 100 字"));
            return;
          }
          callback();
        },
        trigger: "blur"
      }
    ]
  };

  const FormDialog = defineComponent({
    name: "GoodThingCreateDialog",
    setup() {
      return () => (
        <el-form
          ref={formRef}
          model={model}
          rules={goodThingFormRules}
          label-width="108px"
        >
          <el-form-item label="类型" prop="publishType">
            <el-select
              v-model={model.publishType}
              placeholder="请选择"
              class="w-full"
              clearable
            >
              {publishTypeOptions.map(opt => (
                <el-option
                  key={opt.value}
                  label={opt.label}
                  value={opt.value}
                />
              ))}
            </el-select>
          </el-form-item>

          <el-form-item label="标题" prop="title">
            <el-input
              v-model={model.title}
              placeholder="请输入标题"
              maxlength={30}
              show-word-limit
              clearable
            />
          </el-form-item>

          <el-form-item label="实拍图" prop="images">
            <el-upload
              action="/"
              autoUpload={false}
              multiple
              accept="image/*"
              listType="picture-card"
              limit={9}
              fileList={imagesFileList.value}
              onChange={onImagesChange}
              onRemove={onImagesRemove}
            >
              <el-icon>
                <Plus />
              </el-icon>
            </el-upload>
          </el-form-item>

          <el-form-item label="描述" prop="description">
            <el-input
              v-model={model.description}
              type="textarea"
              autosize={{ minRows: 5, maxRows: 10 }}
              placeholder="请输入描述/使用感受"
              maxlength={400}
              show-word-limit
              resize="vertical"
            />
          </el-form-item>

          {model.publishType === "bought" ? (
            <>
              <el-form-item label="购买链接/口令" prop="buyLinkOrCode">
                <el-input
                  v-model={model.buyLinkOrCode}
                  placeholder="请输入购买链接/口令"
                  clearable
                />
              </el-form-item>
              <el-form-item label="购买配置" prop="buyConfig">
                <el-input
                  v-model={model.buyConfig}
                  placeholder="例如：四门套装"
                  maxlength={200}
                  show-word-limit
                  clearable
                />
              </el-form-item>
            </>
          ) : null}

          {model.publishType === "bought" || model.publishType === "self" ? (
            <el-form-item label="价格" prop="buyPrice">
              <el-input-number
                v-model={model.buyPrice}
                min={0}
                precision={2}
                controls-position="right"
                class="w-full"
              />
            </el-form-item>
          ) : null}

          {model.publishType === "self" ? (
            <el-form-item label="微信号" prop="contactWechat">
              <el-input
                v-model={model.contactWechat}
                placeholder="请输入微信号"
                maxlength={100}
                show-word-limit
                clearable
              />
            </el-form-item>
          ) : null}

          {canManageDisabled.value ? (
            <el-form-item label="启用">
              <el-segmented
                v-model={model.isEnabled}
                options={[
                  { label: "启用", value: true },
                  { label: "禁用", value: false }
                ]}
              />
            </el-form-item>
          ) : null}
        </el-form>
      );
    }
  });

  addDialog({
    title: "新增好物",
    width: "860px",
    fullscreenIcon: true,
    sureBtnLoading: true,
    closeOnClickModal: false,
    destroyOnClose: true,
    contentRenderer: () => h(FormDialog),
    beforeSure: async (done, { closeLoading }) => {
      try {
        await formRef.value?.validate();

        const publishType = model.publishType;
        if (!publishType) {
          message("请选择类型", { type: "warning" });
          closeLoading();
          return;
        }

        const payload: CreateGoodThingPayload = {
          publishType,
          title: model.title.trim(),
          images: model.images
            .map(i => ({ url: ensureImageDataUrl(i.url).trim() }))
            .filter(i => Boolean(i.url))
            .slice(0, 9),
          description: model.description.trim()
        };

        if (publishType === "bought") {
          payload.buyLinkOrCode = model.buyLinkOrCode.trim();
          if (model.buyConfig.trim())
            payload.buyConfig = model.buyConfig.trim();
        }

        if (publishType === "self") {
          payload.contactWechat = model.contactWechat.trim();
        }

        if (publishType === "bought" || publishType === "self") {
          if (model.buyPrice != null) payload.buyPrice = model.buyPrice;
        }

        if (canManageDisabled.value) {
          payload.isEnabled = model.isEnabled;
        }

        const res = await createGoodThing(payload);
        if (!res?.goodThingId) {
          message("新增失败", { type: "error" });
          closeLoading();
          return;
        }

        done();
        queryState.page = 1;
        fetchGoodThings();
      } catch {
        closeLoading();
      }
    }
  });
}

async function onToggleRecommend(row: GoodThingItem): Promise<void> {
  try {
    if (row.isRecommended) {
      await unrecommendGoodThing({ goodThingId: row.goodThingId });
    } else {
      await recommendGoodThing({ goodThingId: row.goodThingId });
    }
    fetchGoodThings();
  } catch {
    void 0;
  }
}

async function onDeleteRow(row: GoodThingItem): Promise<void> {
  try {
    await deleteGoodThing({ goodThingId: row.goodThingId });
    if (queryState.page > 1 && serverRows.value.length === 1) {
      queryState.page -= 1;
    }
    fetchGoodThings();
  } catch {
    void 0;
  }
}

fetchGoodThings();
</script>

<template>
  <div>
    <el-card shadow="never">
      <el-form inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryState.keyword"
            placeholder="标题/描述/配置"
            clearable
            class="w-[240px]!"
            @keyup.enter="onSearch"
          />
        </el-form-item>

        <el-form-item label="类型">
          <el-select
            v-model="queryState.publishType"
            clearable
            class="w-[160px]!"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="opt in publishTypeOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="推荐">
          <el-select
            v-model="queryState.isRecommended"
            clearable
            class="w-[160px]!"
          >
            <el-option label="全部" value="" />
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item v-if="canManageDisabled" label="启用">
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

    <PureTableBar class="mt-2" title="好物列表" @refresh="fetchGoodThings">
      <template #buttons>
        <el-space wrap>
          <el-button type="primary" @click="openCreateDialog">
            新增好物
          </el-button>
        </el-space>
      </template>
      <el-table
        :data="serverRows"
        :loading="loading"
        row-key="goodThingId"
        class="w-full"
      >
        <el-table-column prop="goodThingId" label="好物ID" min-width="150" />
        <el-table-column label="封面" width="86">
          <template #default="{ row }">
            <el-image
              v-if="getPreviewImages(row).length"
              :src="getPreviewImages(row)[0]"
              fit="cover"
              class="h-10 w-10 rounded"
              :preview-src-list="getPreviewImages(row)"
              preview-teleported
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="title"
          label="标题"
          min-width="260"
          show-overflow-tooltip
        />
        <el-table-column prop="publishType" label="类型" width="100">
          <template #default="{ row }">
            <el-tag effect="plain">{{
              getPublishTypeText(row.publishType)
            }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="buyPrice" label="价格" width="110" align="right">
          <template #default="{ row }">
            <span v-if="row.buyPrice != null">{{ row.buyPrice }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="启用" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isEnabled" type="success" effect="plain"
              >启用</el-tag
            >
            <el-tag v-else type="info" effect="plain">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isRecommended" label="推荐" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.isRecommended" type="warning" effect="plain"
              >推荐</el-tag
            >
            <el-tag v-else type="info" effect="plain">否</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="viewCount"
          label="浏览"
          width="90"
          align="right"
        />
        <el-table-column
          prop="likeCount"
          label="点赞"
          width="90"
          align="right"
        />
        <el-table-column
          prop="collectCount"
          label="收藏"
          width="90"
          align="right"
        />
        <el-table-column prop="createdAt" label="创建时间" min-width="170" />
        <el-table-column prop="updatedAt" label="更新时间" min-width="170" />
        <el-table-column label="操作" fixed="right" width="260">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="openDetailDialog(row)"
                >详情</el-button
              >
              <el-button
                link
                :type="row.isRecommended ? 'warning' : 'success'"
                @click="onToggleRecommend(row)"
              >
                {{ row.isRecommended ? "取消推荐" : "设为推荐" }}
              </el-button>
              <el-popconfirm
                title="确认删除该好物？"
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
