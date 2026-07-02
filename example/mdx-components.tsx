import React from "react";

// 가상의 Shadcn UI 컴포넌트 임포트
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * MDX 내의 순수 마크다운 요소를 커스텀 React 컴포넌트로 변환하는 매퍼입니다.
 * Astro 표준에서는 MDX `<Content components={mdxComponents} />` 형태로 주입합니다.
 */
export const mdxComponents = {
  // 1. 순수 마크다운 표를 Shadcn Table로 변환
  table: ({ children, ...props }: any) => (
    <div className="my-6 w-full overflow-y-auto rounded-lg border border-border">
      <Table {...props}>{children}</Table>
    </div>
  ),
  thead: TableHeader,
  tbody: TableBody,
  tr: TableRow,
  th: TableHead,
  td: TableCell,

  // 2. 블록인용구(blockquote)를 주의사항(Alert) 스타일 또는 독자적인 디자인으로 렌더링
  blockquote: ({ children }: any) => (
    <Alert className="my-6 border-primary/20 bg-primary/5">
      <AlertDescription className="text-muted-foreground">
        {children}
      </AlertDescription>
    </Alert>
  ),

  // 3. 커스텀 Callout (마크다운 확장 형태)
  Callout: ({ title, children, type = "default" }: any) => {
    const variant = type === "destructive" ? "destructive" : "default";
    return (
      <Alert variant={variant} className="my-8">
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription>{children}</AlertDescription>
      </Alert>
    );
  },
};
