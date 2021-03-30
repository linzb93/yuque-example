import Vue from 'vue'
import Message from './main';

let MessageConstructor = Vue.extend(Message);
let instances = [];
let seed = 1;

const msg = options => {
  let id = 'message_' + seed++;
  const {onClose: userOnClose} = options;
  options.onClose = () => {
    close(id, userOnClose);
  }
	let instance = new MessageConstructor({
		data: options
  });
  instance.id = id;
  instance.$mount();
  document.body.appendChild(instance.$el);
  instance.top = instances.reduce((sum, item) => {
    return sum + item.$el.offsetHeight + 16;
  }, 20);
  instances.push(instance);
  return instance;
};

const close = (id, userOnClose) => {
  const retIndex = instances.findIndex(ins => ins.id === id);
  if (retIndex !== -1) {
    instances.splice(retIndex, 1);
    instances.forEach((ins, index) => {
      ins.top = instances.slice(0, index).reduce((sum, item) => {
        return sum + item.$el.offsetHeight + 16;
      }, 20);
    })
    if (typeof userOnClose === 'function') {
      userOnClose();
    }
  }
}

export default msg;