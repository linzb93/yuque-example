<template>
  <transition name="message-fade" @after-leave="handleAfterLeave">
    <div class="msg" v-show="show" :style="{top: `${top}px`}">
      <span>{{ message }}</span>
    </div>
  </transition>
</template>

<script>
export default {
  data() {
    return {
      show: false,
      type: "",
      message: "",
      duration: 1500,
      onClose: null,
      top: 0,
    };
  },
  mounted() {
    this.show = true;
    setTimeout(() => {
      this.handleClose();
    }, this.duration);
  },
  methods: {
    handleClose() {
      this.show = false;
    },
    handleAfterLeave() {
      this.$destroy();
      this.$el.parentNode.removeChild(this.$el);
      this.onClose();
    },
  },
};
</script>

<style scoped>
.msg {
  position: fixed;
  z-index: 2000;
  border-radius: 2px;
  left: 50%;
  margin-top: 20px;
  transform: translateX(-50%);
  padding: 0 24px;
  height: 48px;
  line-height: 48px;
  background: #fff;
  box-shadow: 4px 0 14px #e9eaf2;
  transition: opacity 0.3s, transform 0.4s, top 0.4s;
}
.msg span {
    margin-left: 8px;
    font-size: 14px;
    color: #3f4156;
  }
.message-fade-enter,
.message-fade-leave-active {
  opacity: 0;
  transform: translate(-50%, -100%);
}
</style>