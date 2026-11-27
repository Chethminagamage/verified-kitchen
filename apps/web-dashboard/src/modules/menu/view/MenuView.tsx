import { Camera, CircleCheck, UtensilsCrossed } from "lucide-react";

import PageHeader from "@/shared/components/ui/PageHeader";
import StatTile from "@/shared/components/ui/StatTile";

import type { MenuPage } from "../model/menu.model";
import DishesSection from "./components/DishesSection";
import ListingCard from "./components/ListingCard";

/** The kitchen's menu and listing, managed by its own operator (self-service, as on delivery platforms). */
export default function MenuView({ data }: { data: MenuPage }) {
  const missingPhotos = data.dishCount - data.withPhotoCount;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Kitchen"
        title="Menu"
        description="Your listing, dishes and photos as customers see them in the Verified Kitchen app."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Dishes" value={data.dishCount} icon={UtensilsCrossed} tone="info" description="On your menu." />
        <StatTile
          label="Available now"
          value={data.availableCount}
          icon={CircleCheck}
          tone={data.availableCount === data.dishCount ? "positive" : "warning"}
          description={
            data.availableCount === data.dishCount
              ? "Everything can be ordered."
              : `${data.dishCount - data.availableCount} marked as sold out.`
          }
        />
        <StatTile
          label="With a photo"
          value={`${data.withPhotoCount}/${data.dishCount}`}
          icon={Camera}
          tone={missingPhotos === 0 ? "positive" : "neutral"}
          description={missingPhotos === 0 ? "Every dish has a photo." : "Dishes with photos get more orders."}
        />
      </section>

      <div className="mt-8">
        <ListingCard listing={data.listing} canManage={data.canManage} />
      </div>

      <DishesSection kitchenId={data.listing.kitchenId} categories={data.categories} canManage={data.canManage} />
    </div>
  );
}
