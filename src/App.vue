<template>
    <div>
        <h1>Quad Detection System</h1>

        <div class="header">
            <div class="select-container">
                <div class="select-head">
                    <ul>
                        <li :class="{active: tabActive === 0}" @click="changeTab(0)"><router-link to="/">Image</router-link></li>
                        <li :class="{active: tabActive === 1}" @click="changeTab(1)"><router-link to="/video">Video</router-link></li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="show-container">
            <router-view></router-view>
        </div>

        <div class="footer">
            © 2024 Ziptrack
            <br>
            Слава Україні
        </div>
  </div>
</template>

<style scoped>
#app img, #app canvas {
    max-width: 100%;
}

.landing-info {
    margin-top: 30px;
}

.select-head {
    color: #fff;
    margin-bottom: 20px;
}

.select-head ul {
    display: flex;
    justify-content: center;
    margin: 0;
    padding: 0;
}

.select-head ul li {
    width: 100px;
    border-left: 1px solid #fff;
    background-color: rgb(144 126 219);
}

.select-head ul li a {
    color: #fff;
}

.select-head ul li.active, .select-head ul li a.active {
    background-color: #2a42af;
}

.select-head ul li:hover {
    cursor: pointer;
}

.upload-tip {
    display: flex;
    justify-content: center;
    align-items: center;
}

.upload-tip p {
    margin-right: 10px;
}

.inputoutput {
    border: 1px solid #2a42af;
    margin-bottom: 30px;
}

.inputoutput img, .inputoutput canvas {
    display: block;
    line-height: 0;
}

.inputoutput p {
    padding: 0;
    margin: 0;
}

.inputoutput .caption {
    background-color: #2a42af;
    color: #fff;
}

.footer{ 
    position: fixed;
    color: rgb(72, 72, 72);     
    text-align: center;
    left: 0px;    
    bottom: 0px; 
    width: 100%;
}
</style>


<script setup>
import { ref } from 'vue';

const tabActive = ref(0);

// switch the tab
function changeTab(index) {
  tabActive.value = index;
}
</script>