"use client";
import { WorkerTestButton } from "@/components/WorkerTestButton";

export default function WorkerTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-3xl font-bold">Web Worker Test</h1>
        <p className="text-gray-600">
          Test the web worker simulation functionality with the buttons below:
        </p>
        <WorkerTestButton />
      </div>
    </main>
  );
}
