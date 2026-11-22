import { handleCreateRequest, handleGetRequest, type ShareKv } from "../../src/lib/cloud-state/share-endpoint";
import { forbiddenOrigin, isSameOriginWrite } from "../../src/lib/cloud-state/same-origin";

type PagesContext = {
  request: Request;
  env: { SHARE_KV?: ShareKv };
  params?: { snapshotId?: string };
};

export async function onRequestPost(context: PagesContext): Promise<Response> {
  if (!isSameOriginWrite(context.request)) return forbiddenOrigin();
  return handleCreateRequest(context.env.SHARE_KV, "tier-list.v1", context.request);
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const snapshotId = context.params?.snapshotId || url.searchParams.get("id") || "";
  return handleGetRequest(context.env.SHARE_KV, "tier-list.v1", snapshotId);
}
