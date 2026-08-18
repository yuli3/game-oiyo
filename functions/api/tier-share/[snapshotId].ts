import { handleGetRequest, type ShareKv } from "../../../src/lib/cloud-state/share-endpoint";

type PagesContext = {
  env: { SHARE_KV?: ShareKv };
  params: { snapshotId?: string };
};

export async function onRequestGet(context: PagesContext): Promise<Response> {
  return handleGetRequest(context.env.SHARE_KV, "tier-list.v1", context.params.snapshotId ?? "");
}
