# VOIX Crashcourse: Building Agent-Ready Vue Applications

## The VOIX Philosophy

VOIX represents a shift where websites become **capability providers** rather than just visual interfaces. Instead of building a siloed chatbot, your application declares its internal state and available actions through standard HTML elements, allowing the user's chosen AI agent to interact with it directly.

To build a robust agentic interface in Vue, we adhere to five core design heuristics supported by the VOIX architecture.

-----

## 1\. Make Internal State Explicitly Legible

**Heuristic:** Systems must make their internal state explicitly legible to agents, providing clear descriptions of entities and system purposes.

**Implementation in Vue:**
Use **`<context>`** elements to expose the "brain" of your application in plain text. This is not for JSON data dumps, but for human-readable summaries of the current state.

### Dynamic Context Strategy

In Vue, bind reactive data directly into the context. As your application state changes, the AI's understanding updates automatically.

```vue
<template>
  <context name="current_order_state">
    Order Status: {{ order.status }}
    Items in Cart: {{ cartItemCount }}
    Shipping Address: {{ user.hasAddress ? 'Set' : 'Missing' }}
    Validation Errors: {{ validationErrors.join(', ') }}
  </context>
</template>

<script setup>
import { computed } from 'vue';
// ... state logic ...
</script>
```

*This approach ensures clarity for both the GUI and the Agent.*

-----

## 2\. Surface Multimodal Interaction State

**Heuristic:** Developers should surface interaction states—such as active selections or input focus—to allow agents to understand "this" or "that" references.

**Implementation in Vue:**
Do not just expose "data"; expose the **UI state**. If a user selects a row in a table, that selection should be reflected in a `<context>` element immediately.

This allows you to use a **single tool** for a list of items, rather than generating thousands of tools. The agent references the ID provided in the context.

```vue
<template>
  <context name="product_list_state">
    Visible Products: {{ products.map(p => p.id).join(', ') }}
    Currently Selected Product ID: {{ selectedId }}
  </context>

  <tool name="add_to_cart" description="Add a specific product to cart">
    <prop name="productId" type="string" required description="The ID of the product to add" />
    <prop name="quantity" type="number" required />
  </tool>
</template>
```

-----

## 3\. Reduce Ambiguity Through Scoping

**Heuristic:** Ambiguity must be reduced through scoping. Tools should only exist when they are contextually relevant to the current interface state.

**Implementation in Vue:**
Leverage Vue's `v-if` directive and component lifecycle to physically remove tools from the DOM when they are not valid. If a tool is not in the DOM, the agent cannot "hallucinate" calling it.

### Contextual Availability (The `v-if` Pattern)

Instead of global tools, place tools inside the components they belong to. Use `v-if` to ensure actions (like "Save Profile") are only visible to the agent when the application is actually in "Edit Mode".

```vue
<template>
  <div class="profile-card">
    <h2>User Profile</h2>
    
    <context name="profile_state">
      Current View: {{ isEditing ? 'Edit Mode' : 'Read Mode' }}
      User Name: {{ user.name }}
    </context>

    <tool 
      v-if="isEditing"
      name="save_profile_changes" 
      description="Commit changes to the user profile"
      @call="handleSave"
    >
      <prop name="name" type="string" />
      <prop name="email" type="string" />
    </tool>

    <button @click="isEditing = !isEditing">
      {{ isEditing ? 'Cancel' : 'Edit Profile' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const isEditing = ref(false);
// ... handleSave logic ...
</script>
```

This enforces a strict state machine: the Agent must request to "Edit Profile" (or wait for the user to click it) before the `save_profile_changes` tool even becomes available to call.

-----

## 4\. Design Actions Around User Intent

**Heuristic:** Actions should be designed around user intent (e.g., "Schedule Meeting") rather than UI mechanics (e.g., "Click Date Picker").

**Implementation in Vue:**
When defining **`<tool>`** elements, create high-level functions that perform complete tasks. Do not create tools for low-level UI manipulation like `open_dropdown` or `type_text`.

### Intent-Based Tools

Provide tools that accept parameters to complete a full workflow in a single step.

```vue
<tool name="click_save_button" description="Clicks the save button" />

<tool 
  name="update_preferences" 
  description="Update user notification preferences"
  @call="handleUpdate"
>
  <prop name="emailNotifications" type="boolean" />
  <prop name="smsNotifications" type="boolean" />
</tool>
```

### Returning Data

Use the `return` attribute to send success/failure messages or data back to the AI, closing the loop on the intent.

```javascript
function handleUpdate(e) {
  try {
    await api.update(e.detail);
    // Confirm intent completion to the AI
    e.target.dispatchEvent(new CustomEvent('return', {
      detail: { success: true, message: 'Preferences updated' }
    }));
  } catch (err) {
    // Report failure
    e.target.dispatchEvent(new CustomEvent('return', {
      detail: { success: false, error: err.message }
    }));
  }
}
```

-----

## 5\. Maintain Transparent and Parallel Affordances

**Heuristic:** Functionalities and terminology should be aligned across modalities (GUI and Agent). What can be done via click must be doable via voice.

**Implementation in Vue:**
Map your `<tool>` handlers to the exact same functions used by your UI event listeners. This ensures parallel affordances and simpler maintenance.

```vue
<script setup>
// Single source of truth for the action
async function deleteItem(id) {
  await store.delete(id);
  notification.show('Deleted');
}

// Handler for AI Event
function onToolCall(e) {
  const { id } = e.detail;
  deleteItem(id); // Reuses the same logic
  e.detail.success = true;
}
</script>

<template>
  <button @click="deleteItem(item.id)">Delete</button>

  <tool 
    name="delete_item" 
    description="Delete an item" 
    @call="onToolCall"
  >
    <prop name="id" type="string" required />
  </tool>
</template>
```

-----

## Technical Setup Guide

### 1\. Vite Configuration

To prevent Vue from attempting to resolve VOIX tags as components, configure the compiler options in `vite.config.js`:

```javascript
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => 
            ['tool', 'prop', 'context', 'array', 'dict'].includes(tag)
        }
      }
    })
  ]
})
```

### 2\. Global Styles

Hide the functional elements from the visual DOM in your global CSS:

```css
tool, prop, context, array, dict {
  display: none;
}
```

### 3\. Tool Best Practices

  * **Unique Names:** Every tool name in the DOM must be unique.
  * **Clear Types:** Use `string`, `number`, or `boolean` in `<prop>` types.
  * **Robust Descriptions:** The `description` attribute is the prompt for the AI. Be verbose about constraints (e.g., "Date in YYYY-MM-DD format").
  * **Error Handling:** Always wrap tool execution in try/catch blocks and report errors back via the `return` event.