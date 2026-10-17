import { redirect } from "next/navigation";
import { EXAMPLE_BOARD_ID } from "@/lib/example-board";

export default function ExamplePage() {
  redirect(`/s/${EXAMPLE_BOARD_ID}?example=1`);
}
