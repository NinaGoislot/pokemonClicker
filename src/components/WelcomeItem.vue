<template>
  <div class="relative mt-8 flex lg:mt-0 lg:py-4 lg:pl-20">
    <i
      class="flex h-8 w-8 place-content-center place-items-center text-(--color-text) lg:absolute lg:-left-6.5 lg:top-[calc(50%-25px)] lg:h-12.5 lg:w-12.5 lg:rounded-lg lg:border lg:border-(--color-border) lg:bg-(--color-background)">
      <slot name="icon"></slot>
    </i>
    <div class="ml-4 flex-1">
      <h3 class="mb-1.5 text-[1.2rem] font-medium text-(--color-heading)">
        <slot name="heading"></slot>
      </h3>
      <slot></slot>
    </div>
  </div>
</template>
